import logo from './logo.svg';
import './App.css';
import React from 'react';

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showResult: null
    }
  }
  render() {
    return (
      <div className="App">
        <button onClick={()=>{
          fetch("api")
            .then((response)=>{
              return response.text()
            }).then((result)=> {
              this.setState({showResult: JSON.stringify(result)})
            })
        }}>Udri!</button>
        {this.state.showResult}
      </div>      
    );
  }
}

export default App;
