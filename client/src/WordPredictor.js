import logo from './logo.svg';
import './App.css';
import React from 'react';
import './wordpredictor.css'

// import {Input, Button} from 'antd'


function hasValue(what) {
    return what != null && what != undefined
}

const PREMIS_LENGTH = 4

export default class WordPredictor extends React.Component {
    constructor(props) {
        super(props)
        
        this.state = {
            prefix: "",
            vocabularyText: "",
            corpus: [],
            predicates: {},
            starters: [],
            terminalPredicates: {},
            results:[],
            numberOfLetters: 8,
            showInput: false,
            error: null,
            selected: []
        }
    }

    componentDidMount() {
        
        fetch("corpus")
            .then(response => response.json())
            .then((result)=>this.process(result.corpus))
        
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
            }

        }

        return result.join('')
    }

    process(vocabularyText) {
        console.clear()
        console.log("processing vocabulary...")
        console.log("--->" + vocabularyText.substring(0,300))

        let voca = this.removeNonChars(vocabularyText, "€@#$%^&*/?-–„“.,:;'\"{}[]()\n\r1234567890")
        let corpus = voca.split(" ").filter(w => w.length > 1).map(w => w.toLowerCase())

        this.setState({vocabularyText: voca, corpus: corpus})

        for(let i=0; i<corpus.length; i++) {
            console.log("-->\"" + corpus[i] + "\"")
        }

        let predicates = {}
        let starters = []
        let terminalPredicates = {}

        let secondLevelNodeCount = 0;
        let firstLevelNodeCount = 0;

        for (let j=0; j<corpus.length; j++) {
            let word = corpus[j]
            for (let i=1; i<word.length; i++) {

                let closure = word[i]

                let indx = i - PREMIS_LENGTH
                if (indx < 0) {
                    indx = 0
                }

                let premise = word.substring(indx, i)

                {
                    let closureCounts = predicates[premise]
                    if (!hasValue(closureCounts)) {
                        predicates[premise] = closureCounts = {}
                        firstLevelNodeCount++
                        if (i < PREMIS_LENGTH) {
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
                if (i == word.length-1) {
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

        console.log("done. node count: " + firstLevelNodeCount + ", second level node count:" + secondLevelNodeCount + ", starters count: " + starters.length)
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
        console.log("\n==== generate " + letterCount + " letter word.")
        let result = ""
   
        let stepsCount = 0
        let creativity = 0
        let terminalQuality = 2

        let premise = null
        let prefixMatched = true

        if (prefix && this.state.starters.length > 0) {
            let starti = Math.floor(Math.random() * this.state.starters.length)
            let i = starti
            do {
                if (this.state.starters[i].startsWith(prefix)) {
                    premise = this.state.starters[i]
                    console.log("~~~ FOUND starter '" + premise + "' for prefix '" + prefix + "'")
                    break
                }
                i++
                if (i>=this.state.starters.length){
                    i = 0
                }
            } while(i != starti)
            if (!premise) {
                console.log("~~~ starter for prefix '" + prefix + "' was not found")
            }
        } 
        
        if (premise == null){
            let rnd = Math.floor(Math.random() * this.state.starters.length)
            premise = this.state.starters[rnd]
            prefixMatched = false
            console.log("starter: " + rnd + " -> '" + premise + "'" )
        }

        result = premise
        stepsCount++

        while(result.length < letterCount) {
            let closures = null 
            let isTerminal = false
            if (result.length == letterCount - 1)
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
           
            result += letter

            let indx = result.length - PREMIS_LENGTH
            if (indx < 0) {
                indx = 0
            }
            premise = result.substring(indx, indx + PREMIS_LENGTH)
        }
        return {result: result, creativity: creativity / stepsCount, terminalQuality: terminalQuality, prefixMatched: prefixMatched }
    }

    onGenerate(count, prefix)
    {
        this.setState({error: null})
        let result = null
        for (let i=20; i>0; i--) {
            result = this.generate(count, prefix)
            // console.log("\n")
            let exist = this.state.corpus.findIndex((val, i) => val === result.result)
            if (exist >= 0) {
                console.log(result.result + "---> is in corpus. skipping")
                result = null
                continue
            }
            exist = this.state.results.findIndex((val, i) => val.result === result.result)
            if (exist >= 0) {
                console.log(result.result + "---> is already found. skipping")
                result = null
                continue
            }
            if (result.terminalQuality < 2) {
                console.log("---> discarding '" + result.result + "' c:" + result.creativity + ", t:" + result.terminalQuality)
                continue
            } 

            break
        }

        if (result) {
            console.log("---> new word (" + count + "): " + result.result)
            this.state.results.splice(0,0,result)
            this.setState({results: this.state.results})
        } else {
            this.setState({error: "Nothing found. Try again ... or something else."})
        }
    }
    
    download(content, filename, contentType)
    {
        if(!contentType) contentType = 'application/octet-stream';
        var a = document.createElement('a');
        var blob = new Blob([content], {'type':contentType});
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();        
    }

    onDownload() {
        let content = []

        for (let i=0; i<this.state.selected.length; i++) {
            content.push(this.state.selected[i].result)
        }

        this.download(content.join(", "), "vseprd.txt")
    }

    onSelect(result) {

        let i = this.state.selected.findIndex((r, i) => r.result === result.result)
        if (i >= 0) {
            console.log("already selected: " + result.result)
            return
        }

        this.state.selected.push(result)
        this.setState({selected: this.state.selected})
    }
    
    render() {

        let lastWordGui = null
        if (this.state.error) {
            lastWordGui = <h3 style={{color: "red"}}>{this.state.error}</h3>
        } else if (this.state.results.length > 0) { 
            let r = this.state.results[0]    
            lastWordGui = (    
                <div className="active-word" onClick={()=>this.onSelect(r)}>
                    <span style={{fontSize: "30px"}}>
                        {r.result}
                    </span>
                    {/* (c:{r.creativity}, t:{r.terminalQuality}, p:{r.prefixMatched.toString()}) */}
                </div>
            )
        }

        return (
            <div>
                <h2 className="main-title">Všeprd - find new words</h2>
                <br/>
                <div>
                    {this.state.showInput
                        ?
                        <div className='content'>
                            <textarea rows="40" cols="100" value={this.state.vocabularyText} 
                                    onChange={(e)=> {
                                        this.setState({vocabularyText: e.target.value})
                                        this.process(e.target.value)
                                    }}
                            />
                            <button onClick={()=> this.setState({showInput:false})}>{"<"}</button>
                        </div>
                        : <button onClick={()=> this.setState({showInput:true})}>{">"}</button>
                    }
                    
                    <div className='content'>
                        {this.state.predicates != null
                        ?
                            <span>
                                <input value={this.state.prefix} onChange={(e) => this.setState({prefix: e.target.value})}/>
                                <input value={this.state.numberOfLetters} onChange={(e) => this.setState({numberOfLetters: parseInt(e.target.value)})}/>
                                <button onClick={()=> this.onGenerate(this.state.numberOfLetters, this.state.prefix)}>Generate!</button>
                                <button onClick={()=> this.setState({results: []})}>x</button>
                            </span>
                        :
                            null
                        } 
                    </div>
                    <br/>
                    <div>
                        { lastWordGui }
                        <br/>
                        {
                            this.state.selected.length > 0
                            ?
                                <div className='selected-words'>
                                    <div style={{fontSize: "12", color:"grey"}}>Your selected words:</div>
                                    <div>
                                        {
                                            this.state.selected.map((r,i) => {
                                                return r.result + (i<this.state.selected.length-1 ? ", " : "")
                                            })
                                        }
                                    </div>
                                    <button onClick={()=>this.onDownload()}>Save</button>
                                </div>
                            : null
                        }

                        <br/>
                        
                        <div>
                            {
                                this.state.results.length > 1
                                ?
                                    <div style={{fontSize: "12", color:"grey"}}>Previous results:</div>
                                :
                                    null
                            }
                            {
                                this.state.results.map((result, i) => {
                                    if (i === 0) {
                                        return null
                                    }
                                    return (
                                        <span key={i} className="active-word" 
                                            onClick={()=> this.onSelect(result)}>
                                            <span style={{fontSize: "20px"}}>
                                                {result.result}
                                            </span>
                                            {/* <span style={{marginLeft:"5px"}}>
                                                (c:{result.creativity}, t:{result.terminalQuality}, p:{result.prefixMatched.toString()})
                                            </span> */}
                                        </span>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}