import {useState} from 'react'
import Learn from './com/Learn'
import Read from './com/Read'
import Write from './com/Write'

import './App.css'

const KEY = {
  LEARN: 'LEARN',
  READ: 'READ',
  WRITE: 'WRITE',
}


function App() {
  const [state, setState] = useState('')


  return (
    <div>
      <header>
        <h1>Chord</h1>
      </header>

      <section>
        <button onClick={E=>setState(KEY.LEARN)}>Learn</button>
        <button onClick={E=>setState(KEY.READ)}>Read</button>
        <button onClick={E=>setState(KEY.WRITE)}>Write</button>
      </section>

      {state===KEY.LEARN?
        <Learn />
      :state===KEY.READ?
        <Read />
      :state===KEY.WRITE?
        <Write />
      :<></>
      }

      <footer>
        <span> &larr; </span>
        
        <span> &rarr; </span>
      </footer>
    </div>
  )
}


export default App