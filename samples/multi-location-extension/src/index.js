import React from "react"
import PropTypes from "prop-types"
import ReactDOM from "react-dom"
import {
  Button,
  Paragraph,
  SectionHeading
} from "@contentful/forma-36-react-components"
import { init, locations } from "contentful-ui-extensions-sdk"
import "@contentful/forma-36-react-components/dist/styles.css"
import "./index.css"

class App extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  }

  state = {
    value: "foo"
    // this.props.sdk.field.getValue()
  }

  componentDidMount() {
    if (!this.props.sdk.location.is(locations.LOCATION_DIALOG)) {
      this.props.sdk.window.startAutoResizer()
    }

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    // this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(
    //   this.onExternalChange
    // )
  }

  componentWillUnmount() {
    if (this.detachExternalChangeHandler) {
      this.detachExternalChangeHandler()
    }
  }

  // onExternalChange = value => {
  //   this.setState({ value })
  // }

  // onChange = e => {
  //   const value = e.currentTarget.value
  //   this.setState({ value })
  //   if (value) {
  //     this.props.sdk.field.setValue(value)
  //   } else {
  //     this.props.sdk.field.removeValue()
  //   }
  // }
  openDialog = () => {
    this.props.sdk.dialogs.openExtension({
      id: "multi-location-extension",
      title: "Foo"
    })
  }

  renderFieldUI = () => {
    return (
      <div>
        <Button
          icon=""
          buttonType="muted"
          onClick={this.openDialog}
          // onBlur={action('onBlur')}
          // href={text('href', '')}
        >
          Open dialog from a field
        </Button>

        <Paragraph style={{ marginTop: "2%" }} element="p">
          This text is show, because this extension was assigned to a field of
          an entry.
        </Paragraph>
      </div>
    )
  }
  renderSidebarUI = () => {
    return (
      <div>
        <Button
          icon=""
          buttonType="muted"
          // isFullWidth={boolean('isFullWidth', false)}
          onClick={this.openDialog}
          // onBlur={action('onBlur')}
          // href={text('href', '')}
        >
          Open dialog from the sidebar
        </Button>

        <Paragraph style={{ marginTop: "5%" }} element="p">
          This text is show, because this extension was assigned to the sidebar
          of an entry.
        </Paragraph>
      </div>
    )
  }

  renderDialogUI = () => {
    return (
      <div>
        {/* <Button
          icon=""
          buttonType="muted"
          // isFullWidth={boolean('isFullWidth', false)}
          onClick={this.props.sdk.close}
          // onBlur={action('onBlur')}
          // href={text('href', '')}
        >
          Close dialog
        </Button> */}

        <Paragraph style={{ margin: "5%" }} element="p">
          This text is show, because this extension is rendered in a dialog.
        </Paragraph>
      </div>
    )
  }

  render = () => {
    if (this.props.sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
      return this.renderSidebarUI()
    }
    if (this.props.sdk.location.is(locations.LOCATION_DIALOG)) {
      return this.renderDialogUI()
    }
    if (this.props.sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
      return this.renderFieldUI()
    }
  }
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById("root"))
})

// Enabling hot reload
if (module.hot) {
  module.hot.accept()
}
