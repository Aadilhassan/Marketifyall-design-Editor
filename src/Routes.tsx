import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import Editor from '@scenes/Editor'
import EmbedEditor from '@scenes/EmbedEditor'
import Landing from '@scenes/Landing'
import About from '@scenes/About'
import Contact from '@scenes/Contact'
import Features from '@scenes/Features'
import EmbedDocs from '@scenes/Embed'
import ExportTest from '@scenes/ExportTest'
import UrlToVideo from './scenes/Dashboard/UrlToVideo'
import Projects from '@scenes/Projects'

const Routes = () => {
  return (
    <Router>
      <Switch>
        <Route path="/embed" component={EmbedEditor} />
        <Route path="/developers" exact component={EmbedDocs} />
        <Route path="/dashboard" exact component={Projects} />
        <Route path="/design/:id/edit" component={Editor} />
        <Route path="/design/edit" component={Editor} />
        <Route path="/design" component={Editor} />
        <Route path="/export-test" exact component={ExportTest} />
        <Route path="/features" exact component={Features} />
        <Route path="/about" exact component={About} />
        <Route path="/contact" exact component={Contact} />
        <Route path="/url-to-video" exact component={UrlToVideo} />
        <Route path="/" exact component={Landing} />
      </Switch>
    </Router>
  )
}

export default Routes
