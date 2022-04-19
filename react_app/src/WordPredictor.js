import logo from './logo.svg';
import './App.css';
import React from 'react';
// import {Input, Button} from 'antd'


function hasValue(what) {
    return what != null && what != undefined
}

const PREMIS_LENGTH = 3

export default class WordPredictor extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
        vocabularyText: "",
        corpus: [],
        predicates: {},
        starters: [],
        terminalPredicates: {},
        results:[],
        numberOfLetters: 5
        }
    }
        
    process() {
        console.clear()
        console.log("processing vocabulary...")
        console.log("--->" + this.state.vocabularyText.substring(0,300))

        let voca = this.state.vocabularyText.replaceAll("."," ").replaceAll(",", " ").replaceAll("\n", " ").replaceAll("'", " ").replaceAll("!", " ")
        let corpus = voca.split(" ").filter(w => w.length > 1)

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

    generate(letterCount) {
        console.log("==== generate " + letterCount + " letter word.")
        let resultLetterCount = 0
        let result = []

        let rnd = Math.floor(Math.random() * this.state.starters.length)

        let premise = this.state.starters[rnd]

        console.log("starter: " + rnd + " -> '" + premise + "'" )
        result.push(premise)

        while(resultLetterCount < letterCount) {
            let closures = null 
            let isTerminal = false
            if (resultLetterCount == letterCount -1)
            {
                isTerminal = true
                closures = this.state.terminalPredicates[premise]    
                if (!hasValue(closures)) {
                    console.log("~~~ premise '" + premise + "' has no terminal closure")
                }
            } 
            
            if (closures == null){
                isTerminal = false
                closures = this.state.predicates[premise]    
            }

            if (!hasValue(closures)) {
                console.log("~~~ premise '" + premise + "' has no closure")
                break
            }

            rnd = Math.random()
            let followingLetters = Object.keys(closures)
            let candidate = null        
            console.log( (isTerminal ? "T " : "") + "thrshold: " + rnd + ", option count: " + followingLetters.length)
            let trialCount = 4
            let stepSize = Math.max(1,followingLetters.length / trialCount)
            let getStep = ()=> Math.round(Math.max(1, Math.random()*stepSize * 1.5))            

            for (let i = Math.round(Math.random()*stepSize / 2); i < followingLetters.length; i += getStep()) {
                let letter = followingLetters[i]
                let val = closures[letter]
                if (val >= rnd || candidate == null) {
                    candidate = letter
                    let decision = Math.random()
                    if ( decision < 1/followingLetters.length) {
                        console.log("- " + i + ")" + letter + ": " + val + ": cool. decision " + decision + " < threshold " + (1/followingLetters.length) + " WINNER!")
                        break
                    } else {
                        console.log("- " + i + ")" + letter + ": " + val + ": cool. decision " + decision + " !< threshold " + (1/followingLetters.length) + " ... continue")
                    }
                } else {
                    console.log("- " + i + ")" + letter + ": " + val + "... reject")
                }                
            }

            if (candidate == null) {
                throw new Error("no candidate")
            }

            premise = candidate
            result.push(premise)
            resultLetterCount += premise.length
        }
        return result.join("")        
    }

    onGenerate(count)
    {
        let newword = this.generate(count)
        console.log("new word (" + count + "): " + newword)
        this.state.results.push(newword)
        this.setState({results: this.state.results})
    }

    render() {

        return (
            <div>
                <div>
                    <textarea rows="40" cols="100" value={this.state.vocabularyText} 
                        onChange={(e)=> this.setState({vocabularyText: e.target.value})}
                    />
                </div>
                <button onClick={()=> this.process()}>Process!</button>
                <div>
                    {this.state.predicates != null
                    ?
                        <span>
                            <input value={this.state.numberOfLetters} onChange={(e) => this.setState({numberOfLetters: parseInt(e.target.value)})}/>
                            <button onClick={()=> this.onGenerate(this.state.numberOfLetters)}>Generate!</button>
                        </span>
                    :
                        null
                    } 
                </div>
                {
                    this.state.results.join(", ")
                }
            </div>
        );
    }
}