import './App.css';
import React from 'react';
import './wordpredictor.css';
import {Input, Button, Tooltip, Space, Typography, Select} from 'antd'
import { hasValue } from './util';

export default class SuffixLab extends React.Component {

    constructor(props) {
        super(props)
        this.languager = props.languager
        this.state = {
            levels: []
        }
    }

    render() {

        let summary = null
        let summaryRows = []
        let levels = null
        if (hasValue(this.languager) && hasValue(levels = this.state.suffixLevels)) {        
            levels.forEach((level, i) => {
                let levelSummary = []
                for(let i=0; i<level.length && i<30; i++) {
                    let entry = level[i]
                    levelSummary.push((<td className='header'>{entry.suffix}</td>))
                    levelSummary.push((<td style={{textAlign:"right"}}>{Math.floor(1000*entry.factor)}&nbsp;&nbsp;&nbsp;</td>))
                }
                summaryRows.push(<tr>{levelSummary}</tr>)
            })
            summary = <table>{summaryRows}</table>
        }
        return (
            <div>
                <Input placeholder="threshold" value={this.state.suffThreshold} onChange={(e) => this.setState({suffThreshold: e.target.value})}/>
                {summaryRows}
                <Button onClick={()=> {
                    this.languager.radixAnalysis()
                    
                }}>Test</Button>
            </div>
        )
    }
}