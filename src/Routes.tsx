import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import Editor from '@scenes/Editor'
import Landing from '@scenes/Landing'

const Routes = () => {
  return (
    <Router>
      <Switch>
        <Route path="/design/edit" component={Editor} />
        <Route path="/design" component={Editor} />
        <Route path="/" exact component={Landing} />
      </Switch>
    </Router>
  )
}

export default Routes
