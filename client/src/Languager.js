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
        }
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

    process(vocabularyText) {
        console.log("processing vocabulary...")
        // console.log("--->" + vocabularyText.substring(0,300))

        let voca = this.removeNonChars(vocabularyText, "€@#$%^&*/?!-–„“.,:;'\"{}[]()\n\r1234567890")
        let corpus = voca.split(" ").filter(w => w.length > 1).map(w => w.toLowerCase())

        this.setState({vocabularyText: voca, corpus: corpus})

        // for(let i=0; i<corpus.length; i++) {
        //     console.log("-->\"" + corpus[i] + "\"")
        // }

        let predicates = {}
        let starters = []
        let terminalPredicates = {}

        let secondLevelNodeCount = 0;
        let firstLevelNodeCount = 0;

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

}