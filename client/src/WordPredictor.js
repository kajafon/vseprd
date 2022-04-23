import logo from './logo.svg';
import './App.css';
import React from 'react';
import './wordpredictor.css';
import {Input, Button, Tooltip, Space, Typography, Select} from 'antd'
import Languager from './Languager';
import SuffixLab from './SuffixLab';


const PREMIS_LENGTH = 3
const corpuses = {"saristina":"Šariština", "dennikn":"Spisovná slovenčina", "stackoverflow":"Angličtina"}
const corpusKeys = Object.keys(corpuses);

export default class WordPredictor extends React.Component {

    constructor(props) {
        super(props)
        console.log("constructor")
        this.languager = new Languager(PREMIS_LENGTH)
        this.state = {
            prefix: "",
            results:[],
            numberOfLetters: 8,
            showInput: false,
            error: null,
            selected: [],
            selectedCorpus: corpusKeys[0],
        }
    }

    componentDidMount() {
        console.log("... component did mount")
        this.loadCorpus()
    }

    loadCorpus(corpusName)
    {
        if (!corpusName) {
            corpusName = this.state.selectedCorpus
        } else {
            this.setState({selectedCorpus: corpusName})
        }

        fetch("corpus/" + corpusName)
            .then(response => response.json())
            .then((result)=> {
                this.process(result.corpus)
                this.setState({vocabularyText: result.corpus})
            })
    }
        
    process(inputText) {
        this.languager.process(inputText)
        console.log("wp: starters len:" + this.languager.startersLen())
        this.forceUpdate()
    }

    onGenerate(count, prefix)
    {
        if (!this.languager.isReady()) {
            this.setState({error: "Nie je podľa čoho slová vytvoriť. Vlož nejaký text."})
            return
        }

        this.setState({error: null})
        let result = null
        for (let i=20; i>0; i--) {
            result = this.languager.generate(count, prefix)
            if (result === null) {
                break
            }
            
            if (this.languager.isInCorpus(result.result)) {
                console.log(result.result + "---> is in corpus. skipping")
                result = null
                continue
            }
            let exist = this.state.results.findIndex((val, i) => val.result === result.result)
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
            this.setState({error: "Nič som tentoraz nenašiel. Skús znova, alebo zmeň zadanie."})
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

    onCharNumChanged(val) {
        let num = parseInt(val)
        if (isNaN(num)) {
            num = 0
        }
        this.setState({numberOfLetters: num})
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
                        <Typography.Title level={2}>{r.result}</Typography.Title>
                    </span>
                    {/* (c:{r.creativity}, t:{r.terminalQuality}, p:{r.prefixMatched.toString()}) */}
                </div>
            )
        }

        let corpusBtns = corpusKeys.map((c) => {
            return (<Button 
                className='round-btn'
                onClick={()=>{this.loadCorpus(c)}}
            >
                {corpuses[c]}
            </Button>)
        })

        return (
            <div>
                <br/>
                <br/>
                <SuffixLab languager={this.languager}/>
                <br/>
                <br/>
                <Typography.Title className="center title" level={1}>VŠEPRD</Typography.Title>
                <div className='center'>
                    <Typography.Title type="secondary" className="center description" level={5}>
                        Vygeneruj si nové slová podľa textu. Pravidlá tvorby slov sa extrahujú zo vstupného
                        textu. Je k dispozícii zopár vzorových, ale môžeš si vložiť aj vlastný. 
                        V akomkoľvek jazyku. Nové slovo je nové len vzhľadom na vstupný text. Stáva sa,
                        že sa vytvorí slovo, ktoré sa síce v texte nevyskytlo, aspoň nie v danom tvare, 
                        ale je to platné slovo v danom jazyku.
                    </Typography.Title>
                </div>
                <br/>
                <br/>
                <div>
                    {this.state.showInput
                        ?
                        <div className='center'>
                            <div className='input-container'>
                                <Space>
                                    <Tooltip title="Zbaliť">
                                        <Button onClick={()=> this.setState({showInput:false})}>{"<"}</Button>
                                    </Tooltip>
                                    { corpusBtns }                                
                                </Space>
                                {
                                    this.state.showInput && this.state.showProcessed
                                    ?
                                        <div className='pale-text some-space left-align'>Mám to. Môžeš generovať slová.</div>
                                    : null
                                }
                                <Input.TextArea className="some-space corpus-input" value={this.state.vocabularyText} 
                                        onChange={(e)=> {
                                            this.setState({vocabularyText: e.target.value, selectedCorpus: null})
                                            this.process(e.target.value)
                                            if (this.state.showInput) {
                                                this.setState({showProcessed: true})
                                            }
                                        }}
                                />
                            </div>
                        </div>
                        : null
                    }
                    
                    <div className='center'>
                        <div className='left-align input-container'>
                            {
                                this.state.selectedCorpus
                                ?                            
                                    <div className='pale-text right-align'
                                        onClick={()=> this.setState({showInput: true})} 
                                    >
                                        <span className='active-word'>[{corpuses[this.state.selectedCorpus]}]</span>
                                    </div>
                                :   null
                            }

                            {this.languager.isReady()
                            ?
                                <span>
                                    <Space>
                                        {
                                        !this.state.showInput   
                                        ?                             
                                            <Tooltip title="Rozbaliť">
                                                <Button onClick={()=> this.setState({showInput:true, showProcessed: false})}>{">"}</Button>
                                            </Tooltip>
                                        : null
                                        }
                                        <Input placeholder="Začiatok slova ..." className="input-main" value={this.state.prefix} onChange={(e) => this.setState({prefix: e.target.value})}/>
                                        <Input suffix="znakov" className="input-main" value={this.state.numberOfLetters} onChange={(e) => this.onCharNumChanged(e.target.value)}/>
                                        <Button type="primary" onClick={()=> this.onGenerate(this.state.numberOfLetters, this.state.prefix)}>Daj mi nové slovo!</Button>
                                    </Space>
                                </span>
                            :
                                null
                            } 
                        </div>
                    </div>
                    <br/>
                    <div>
                        <div className='center'>
                        { lastWordGui }
                        </div>
                        <br/>
                        {
                            this.state.selected.length > 0
                            ?
                                <div className='some-space'>
                                    <Typography.Title type="secondary" level={5} className="bottom-space">
                                       Tvoj výber:
                                    </Typography.Title>
                                    <div className='selected-words'>
                                        <div className='bottom-space'>
                                            {
                                                this.state.selected.map((r,i) => {
                                                    return r.result + (i<this.state.selected.length-1 ? ", " : "")
                                                })
                                            }
                                        </div>
                                        <Button size="small" onClick={()=>this.onDownload()}>Ulož</Button>
                                    </div>
                                </div>
                            : null
                        }

                        <div>
                            {
                                this.state.results.length > 1
                                ?
                                    <div className='some-space'>
                                        {/* <Typography.Title type="secondary" level={5} className="bottom-space">
                                            :
                                        </Typography.Title> */}
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
                                                        {
                                                            i < this.state.results.length-1
                                                            ? <span>&nbsp;&nbsp;&nbsp;</span>
                                                            : null
                                                        }
                                                    </span>
                                                )
                                            })
                                        }
                                    </div>    
                                :
                                    null
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}