import { hasValue } from './util';


export default class Languager {

    
    constructor(premise_length) {
        console.log("constructor")
        this.state = {
            premise_length: premise_length,
            vocabularyText: "",
            corpus: [],
            predicates: {},
            starters: [],
            terminalPredicates: {},
            radixes: {}
        }
    }
  
    getSuffixLevels() {
        return this.state.suffixLevels
    }

    /* 
        Processes this.state.corpus. Finds max common cores between pairs of words. 
        Radix is term for core descriptor. Core is a core part of a word.

        returns { radixes, wordcores }

        radixes: [{core:string, words:[{core, words, factor}]}]
               - sorted by core.length longest first
        wordCores: {word -> {core, words}}    
    */
    extractRadixes()
    {
        let wordCores = {} /* word -> {core -> {core, wordsSet}} */
        let coreEntries = {} /* core -> {core, wordsSet} */

        
        let registerWordCore = (word, core) => {
            let w2r = wordCores[word]
            if (!(hasValue(w2r))) {
                wordCores[word] = w2r = {}
            }
            w2r[core.core] = core
        }

        let registerCore = (core, w1, w2) => {
            let entry = coreEntries[core] 
            if (!hasValue(entry)) {
                coreEntries[core] = entry = {core: core, wordsSet:{}}
                entry.wordsSet[w1] = true
            }
            entry.wordsSet[w2] = true
            return entry
        }

        for(let w1_index=0; w1_index<this.state.corpus.length-1; w1_index++) {
            let w1 = this.state.corpus[w1_index]
            for(let w2_index=w1_index+1; w2_index<this.state.corpus.length; w2_index++) {
                let w2 = this.state.corpus[w2_index]
                if (w1 == w2) {
                    continue
                }
                let core = this.getMaxComonCore(w1, w2)

                let f1 = core.length / w1.length
                let f2 = core.length / w2.length

                if (f1 < 0.6 || f2 < 0.6) {
                    continue
                }

                if (core.length > 2) {
                    let radix = registerCore(core, w1, w2)
                    registerWordCore(w1, radix)
                    registerWordCore(w2, radix)
                }
            }    
        }

        let cores = Object.keys(coreEntries)
        let radixes = []

        for (let i=0; i<cores.length; i++) {
            let entry = coreEntries[cores[i]] /* {core, wordsSet:{}} */
            let words = Object.keys(entry.wordsSet)
            entry.factor = Math.floor(1000*words.length / this.state.corpus.length)
            entry.words = words
            radixes.push(entry)
        }

        radixes.sort((r1, r2)=>{
            return r2.core.length - r1.core.length
        })

        this.setState({radixes: radixes, wordCores: wordCores})
        return {radixes: radixes, wordCores: wordCores}
    }

    /*
       wordCores: {<word> -> {coreWord -> radix} }
       radix: {core, words{w->[cores...]}, factor}

       returns {core -> {core, words, ...}}
          hopefully reasonable word cores, without garbage
     */
    refineRadixes(wordCores) {

        let refinedRadixes = {}
  
        let words = Object.keys(wordCores) 
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            let w = words[wordIndex]
            let rdxList = Object.values(wordCores[w])
            
            if (rdxList.length === 1) {
                refinedRadixes[rdxList[0].core] = rdxList[0]
                continue
            }

            let max = null
            
            for(let j=0; j<rdxList.length; j++) {
                rdxList[j].scoreList = []
                if (w.indexOf(rdxList[j].core) == 0) {
                    rdxList[j].scoreList.push(3)
                }
                if (max == null || max.core.length <= rdxList[j].core.length) {
                    max = rdxList[j]
                }
            }

            max.scoreList.push(5)

            for(let j=0; j<rdxList.length-1; j++) {
                for(let i=j+1; i<rdxList.length; i++) {
                    let r1 = rdxList[j]
                    let r2 = rdxList[i]

                    if (r1.core.length > r2.core.length) {
                        let _tmp = r2
                        r2 = r1
                        r1 = _tmp
                    }

                    if (r2.core.indexOf(r1.core) == 0) {
                        let l1 = r1.core.length
                        let l2 = r2.core.length
                        let dif = l2 - l1
                        if (dif < 0) {
                            throw new Error("matka pica")
                        }
                        if (dif > 0 && (dif <= 2 || dif < l1 / 2)) {
                            r1.scoreList.push(6)
                        }
                    }    
                }
            }

            max = null
            
            for(let j=0; j<rdxList.length; j++) {
                let rdx = rdxList[j]
                rdx.score = 0
                for(let i=0; i<rdx.scoreList.length; i++ ) {
                    rdx.score += rdx.scoreList[i]
                }
                if (max == null || rdx.score > max.score) {
                    max = rdx
                }
            }

            let rfRdx = refinedRadixes[max.core]
            if (hasValue(rfRdx)) {
                if (rfRdx != max) {
                    let _words = {}
                    rfRdx.words.forEach(w=>_words[w] = true)
                    max.words.forEach(w=>_words[w] = true)
                    rfRdx.words = Object.keys(_words)
                }
            } else {
                refinedRadixes[max.core] = max
            }
        }

        return refinedRadixes
    }

    /*
        refinedRadixes: {core -> {core, words}}  

        collects suffixes following logic: 
           
            word = core|suffix

        returns [{suffix, count}]
    */
    suffixesFromRefinedRadixes(refinedRadixes) {
        let suffixDict = {}
        let addSuffix = (suffix) => {
            let entry = suffixDict[suffix]
            if (!hasValue(entry)) {
                suffixDict[suffix] = entry = {suffix: suffix, count: 0}
            }
            entry.count++
        } 

        Object.entries(refinedRadixes).forEach(([core, coreDescriptor], i) => {
            coreDescriptor.words.forEach(w => {
                let i = w.indexOf(core)
                let suf = w.substring(i+core.length)
                if (suf.length > 0) {
                    addSuffix(suf)
                }
            })
        })

        let suffixes = Object.values(suffixDict)
        suffixes.sort((s1,s2)=> s2.count - s1.count)
        return suffixes
    }

    radixAnalysis() {        
        let {radixes, wordCores} = this.extractRadixes() 
        let refinedRadixes = this.refineRadixes(wordCores)
        let suffixDescriptors = this.suffixesFromRefinedRadixes(refinedRadixes)


    }

    getMaxComonCore(w1, w2)
    {
        let maxCore = "";
        let core = ""

        for (let offset2 = w1.length-1; offset2 + w2.length >= 0; offset2--) {                   
            let core = ""            
            for (let i = -Math.min(0, offset2); i<w2.length && i + offset2 < w1.length; i++) {
                let ch1 = w1[offset2 + i]
                let ch2 = w2[i]
                if (ch1 === ch2) {
                    core = core + ch1
                    if (core.length > maxCore.length) {
                        maxCore = core
                    }                        
                } else {
                    core = ""
                }
            }
        }            

        //console.log("max core:'" + maxCore + "'(" + w1 + ", " + w2 + ")")

        return maxCore;
    }


    isReady() {
        return this.state.starters.length > 0
    }

    startersLen() {
        return this.state.starters.length
    }
    
    isInCorpus(word) {
        const finder = function(val, i) { return val === word }
        return 0 <= this.state.corpus.findIndex(finder)
    }
    
    setState(newState) {
        Object.assign(this.state, newState)
    }

    getVocabularyText() {
        return this.state.vocabularyText
    }

    removeNonChars(input, forbidden){
        let result = []

        for (let i=0; i<input.length; i++) {
            let isOk = true
            for(let j=0; j<forbidden.length; j++) {
                if (input[i] === forbidden[j]) {
                    isOk = false
                    break;
                }
            }

            if (isOk) {
                result.push(input[i])
            } else {
                result.push(" ")
            }

        }

        return result.join('')
    }

    processInputText(input){
        console.log("processing vocabulary...")

        let result = []

        const sentenceTerminals = "?!.:;\n\r(){}[]/„“”'\""
        const nonchars = " \\…€@#$%^&*,-–\t1234567890"

        let sentences = []
        let sentence = []  
        let corpus = []

        let wordChars = []

        let terminateWord = (endOfSentence) => {
            if (wordChars.length > 0) {
                let word = wordChars.join("")
                corpus.push(word)
                sentence.push(word)
                wordChars.splice(0, wordChars.length)
            }

            if (endOfSentence) {
                if (sentence.length > 1) {
                    sentences.push(sentence)
                }
                sentence = []
            }
        }

        for (let i=0; i<input.length; i++) {
            let char = input[i].toLowerCase()
            let endOfSentence = 0 <= sentenceTerminals.indexOf(char)
            let isChar = !endOfSentence && 0 > nonchars.indexOf(char) 

            if (isChar) {
                wordChars.push(char)
            } else {
                terminateWord(endOfSentence)               
            }            
        }

        terminateWord(true)
        
        corpus.sort((c1,c2) => {
            return c1.localeCompare(c2)
        })

        let filteredCorpus = []
 
        filteredCorpus.push(corpus[0])
        for (let i = 1; i<corpus.length; i++) {
            if (corpus[i] != corpus[i-1]) {
                filteredCorpus.push(corpus[i])
            }
        }

        console.log("remove doubles:" + corpus.length + " -> " + filteredCorpus.length)

        corpus = filteredCorpus

        let processedInputText = sentences.map((s) => s.join(" ")).join(". ")
        this.setState({vocabularyText: processedInputText, corpus: corpus, sentences: sentences})
    }

    extractWordPredicates() {
        // let voca = this.removeNonChars(vocabularyText, "…€@#$%^&*/?!-–„“”.,:;'\"{}[]()\n\r1234567890")
        //voca.split(" ").filter(w => w.length > 1).map(w => w.toLowerCase())

        console.log("extracting word predicates...")
 
        let predicates = {}
        let starters = []
        let terminalPredicates = {}

        let secondLevelNodeCount = 0;
        let firstLevelNodeCount = 0;

        let corpus = this.state.corpus

        for (let j=0; j<corpus.length; j++) {
            let word = corpus[j]
            for (let i=1; i<word.length; i++) {

                let closure = word[i]

                let indx = i - this.state.premise_length
                if (indx < 0) {
                    indx = 0
                }

                let premise = word.substring(indx, i)

                {
                    let closureCounts = predicates[premise]
                    if (!hasValue(closureCounts)) {
                        predicates[premise] = closureCounts = {}
                        firstLevelNodeCount++
                        if (i < this.state.premise_length) {
                            starters.push(premise)
                        }
                    }

                    if (!closureCounts[closure]) {
                        closureCounts[closure] = 0
                        secondLevelNodeCount++
                    }
                    closureCounts[closure] += 1
                }

                /* terminals */
                if (i === word.length-1) {
                    let closureCounts = terminalPredicates[premise]
                    if (!hasValue(closureCounts)) {
                        terminalPredicates[premise] = closureCounts = {}
                        firstLevelNodeCount++
                    }
    
                    if (!closureCounts[closure]) {
                        closureCounts[closure] = 1
                        secondLevelNodeCount++
                    }
                    // closureCounts[closure] += 1
                }
            }
        }

        /* normalise */

        this.normalize(predicates)
        this.normalize(terminalPredicates)

        this.setState({predicates: predicates, starters: starters, terminalPredicates: terminalPredicates})

        console.log("done. src word count:" + corpus.length + ", node count: " + firstLevelNodeCount + ", second level node count:" + secondLevelNodeCount + ", starters count: " + starters.length)
        console.log("starters length: " + this.state.starters.length)
    }

    normalize(predicates) {
        let predicateEntries = Object.entries(predicates)

        for (const [premise, collection] of predicateEntries) 
        { 
            let max = 0
            Object.keys(collection).forEach(key => {
                let count = collection[key]
                let newVal = Math.log(count + 1)
                collection[key] = newVal
                if (newVal > max) {
                    max = count
                }
            })

            Object.keys(collection).forEach(key => {
                collection[key] = collection[key] / max
            })
        }
    }

    process(inputText) {
        this.processInputText(inputText)
        this.extractWordPredicates()
    }

    /* generates a random word  based on predicates, starters and terminals*/
    generate(letterCount, prefix) {
        if (this.state.starters.length === 0) {
            console.log("empty corpus. not generating")
            return null
        }
        console.log("\n==== generate " + letterCount + " letter word.")
        let result = ""
   
        let stepsCount = 0
        let creativity = 0
        let terminalQuality = 2

        let premise = null
        let prefixMatched = true
        
        if (prefix) {
            result = prefix
            if (prefix.length > this.state.premise_length) {
                premise = prefix.substring(prefix.length - this.state.premise_length)
            } else {
                premise = prefix
            }
        } else {
            let rnd = Math.floor(Math.random() * this.state.starters.length)
            premise = this.state.starters[rnd]
            prefixMatched = false
            console.log("starter: " + rnd + " -> '" + premise + "'" )
            result = premise
        }

        stepsCount++

        while(result.length < letterCount) {
            let closures = null 
            let isTerminal = false
            if (result.length === letterCount - 1)
            {
                isTerminal = true
                closures = this.state.terminalPredicates[premise]    
                if (!hasValue(closures)) {
                    console.log("~~~ premise '" + premise + "' has no terminal closure")
                    terminalQuality--
                }
            } 
            
            if (closures == null){
                isTerminal = false
                closures = this.state.predicates[premise]    
            }

            if (!hasValue(closures)) {
                console.log("~~~ premise '" + premise + "' has no closure")
                terminalQuality--
                break
            }

            let followingLetters = Object.keys(closures)
            let i = Math.floor(Math.random()*followingLetters.length)
            let letter = followingLetters[i]
            console.log( (isTerminal ? "T " : "") + "{" + premise + "} -> '" + letter + "', option count: " + followingLetters.length)
            stepsCount += followingLetters.length
           
            result += letter

            let indx = result.length - this.state.premise_length
            if (indx < 0) {
                indx = 0
            }
            premise = result.substring(indx, indx + this.state.premise_length)
        }
        return {result: result, creativity: creativity / stepsCount, terminalQuality: terminalQuality, prefixMatched: prefixMatched }
    }

    /* collects endings of words of different lengts (levels), calculates prevalence */
    suffixSummary()
    {
        let levels = []

        for (let level = 1; level < 10; level++) {
            let entries = {}
            for (let i = 0; i < this.state.corpus.length; i++) {
                let word = this.state.corpus[i]
                if (word.length <= level) {
                    continue
                }
                let suffix = word.substring(word.length - level)

                let entry = entries[suffix]
                if (!hasValue(entry)) {
                    entries[suffix] = entry = {count: 0}
                }

                entry.count++               
            }


            let suffixies = []
            let keys = Object.keys(entries)
            for (let i = 0; i < keys.length; i++) {
                let entry = entries[keys[i]]
                suffixies.push({suffix: keys[i], count: entry.count, factor: entry.count / this.state.corpus.length})
            }

            suffixies.sort((s1,s2)=> {
                return s2.factor - s1.factor
            })

            levels.push(suffixies)
        }

        this.setState({suffixLevels: levels})
        return levels
    }

}