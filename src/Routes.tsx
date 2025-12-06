import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import Editor from '@scenes/Editor'
import Landing from '@scenes/Landing'
import About from '@scenes/About'
import Contact from '@scenes/Contact'
import Features from '@scenes/Features'
import EmbedDocs from '@scenes/Embed'

const Routes = () => {
  return (
    <Router>
      <Switch>
        <Route path="/embed" component={Editor} />
        <Route path="/developers" exact component={EmbedDocs} />
        <Route path="/design/edit" component={Editor} />
        <Route path="/design" component={Editor} />
        <Route path="/features" exact component={Features} />
        <Route path="/about" exact component={About} />
        <Route path="/contact" exact component={Contact} />
        <Route path="/" exact component={Landing} />
      </Switch>
    </Router>
  )
}

export default Routes
