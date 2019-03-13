import React from "react"
import PropTypes from "prop-types"
import ReactDOM from "react-dom"
import {
  SectionHeading,
  Subheading,
  Heading,
  Icon,
  Button,
  Illustration,
  Paragraph
} from "@contentful/forma-36-react-components"
import { init } from "contentful-ui-extensions-sdk"
import "@contentful/forma-36-react-components/dist/styles.css"
import readFileAsURL from "./read-file"
import "./index.css"

const ASSET_PROCESSING_POLL_MS = 1000
const MAX_ASSET_TITLE_LEN = 25

class App extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  }

  dropzoneEl = React.createRef()
  state = {
    value: this.props.sdk.field.getValue()
  }

  componentDidMount() {
    this.props.sdk.window.startAutoResizer()

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(
      this.onExternalChange
    )

    addEventListener(
      this.dropzoneEl.current,
      [
        "drag",
        "dragstart",
        "dragend",
        "dragover",
        "dragenter",
        "dragleave",
        "drop"
      ],
      prevent
    )

    addEventListener(this.dropzoneEl.current, ["dragover", "dragenter"], () => {
      this.setState({
        dragover: true
      })
    })

    addEventListener(
      this.dropzoneEl.current,
      ["dragleave", "dragend", "drop"],
      () => {
        this.setState({
          dragover: false
        })
      }
    )

    addEventListener(this.dropzoneEl.current, ["drop"], this.onDropFiles)

    if (this.state.value) {
      this.props.sdk.space
        .getAsset(this.state.value.sys.id)
        .then(asset => this.setState({ asset }))
        .catch(this.onError)
    }
  }

  componentWillUnmount() {
    this.detachExternalChangeHandler()
  }

  createAsset = (upload, file) => {
    return this.props.sdk.space.createAsset({
      fields: {
        title: {
          "en-US": trimFilename(file.name, MAX_ASSET_TITLE_LEN)
        },
        description: {
          "en-US": ""
        },
        file: {
          "en-US": {
            contentType: file.type,
            fileName: file.name,
            uploadFrom: {
              sys: {
                type: "Link",
                linkType: "Upload",
                id: upload.sys.id
              }
            }
          }
        }
      }
    })
  }

  onDropFiles = async e => {
    e.preventDefault()
    e.stopPropagation()

    this.setUploadProgress(0)

    // Read the file that was just selected
    const file = Array.prototype.slice.call(
      e.target.files || e.dataTransfer.files
    )[0]

    this.setUploadProgress(10)
    this.setState({ file })

    // Encode the file as Base64, so we can pass it through SDK proxy to get it uploaded
    const base64ImageURL = await readFileAsURL(file)
    const base64Data = base64ImageURL.split(",")[1]
    this.setState({ base64ImageURL })
    this.setUploadProgress(10)

    // Upload the Base64 encoded image
    const upload = await this.props.sdk.space.createUpload(base64Data)
    this.setUploadProgress(50)

    // Create an unprocessed asset record that links to the upload record created above
    // It reads asset title and filenames from the HTML5 File object we're passing as second parameter
    const rawAsset = await this.createAsset(upload, file)
    this.setUploadProgress(65)

    // Send a request to start processing the asset. This will happen asynchronously.
    await this.props.sdk.space.processAsset(
      rawAsset,
      this.props.sdk.field.locale
    )

    this.setUploadProgress(70)

    // Wait until asset is processed.
    const processedAsset = await this.props.sdk.space.waitUntilAssetProcessed(
      rawAsset.sys.id,
      this.props.sdk.field.locale
    )
    this.setUploadProgress(100)

    this.setState({
      asset: processedAsset
    })

    this.props.sdk.field
      .setValue({
        sys: {
          type: "Link",
          linkType: "Asset",
          id: processedAsset.sys.id
        }
      })
      .catch(err => console.error(err))
  }

  onError = error => {
    this.props.sdk.notifier.error(error.message)
  }

  onExternalChange = value => {
    this.setState({ value })
  }

  onChange = e => {
    const value = e.currentTarget.value
    this.setState({ value })
    if (value) {
      this.props.sdk.field.setValue(value)
    } else {
      this.props.sdk.field.removeValue()
    }
  }

  setUploadProgress(percent) {
    this.setState({
      uploading: percent < 100,
      uploadProgress: percent
    })
  }

  render = () => {
    if (this.state.uploading) return this.renderUploaderProgress()
    if (this.state.asset) return this.renderAsset()

    return (
      <div
        className={`uploader viewport centered ${
          this.state.dragover ? "dragover" : ""
        }`}
        ref={this.dropzoneEl}
      >
        <section>
          <Button buttonType="muted" extraClassNames="button browse-button">
            <input
              className="file-picker"
              type="file"
              accept="image/x-png,image/gif,image/jpeg"
              onChange={this.onDropFiles}
            />
            Select files
          </Button>

          <Icon
            color={this.state.dragover ? "secondary" : "muted"}
            icon="Asset"
            size="large"
            extraClassNames="image-icon"
          />
          <Subheading extraClassNames="image-icon-label">
            Drop an image here
          </Subheading>
        </section>
      </div>
    )
  }

  renderUploaderProgress() {
    const imageUrl = {
      backgroundImage: `url(${this.state.base64ImageURL})`
    }

    // Pass upload progress as CSS variable so we can adjust the size of progress components
    const uploadProgress = {
      "--uploadProgress": `${this.state.uploadProgress}%`
    }

    return (
      <div className="viewport">
        <div className="progress" style={imageUrl}>
          <div className="bar" style={uploadProgress} />
          <div className="bar-placeholder" style={uploadProgress} />
          <div className="overlay" style={uploadProgress} />
        </div>
      </div>
    )
  }

  renderAsset() {
    const file = this.state.asset.fields.file[this.props.sdk.field.locale]
    const prettySize = `${(file.details.size / 1000000).toFixed(2)} MB`
    const bg = {
      backgroundImage: `url(${file.url})`
    }

    return (
      <div className="asset viewport" ref={this.dropzoneEl}>
        <header style={bg} />
        <section className="details">
          <main>
            <Heading extraClassNames="filename">
              {trimFilename(file.fileName, MAX_ASSET_TITLE_LEN)}
            </Heading>
            <Paragraph extraClassNames="row">
              <strong>Dimensions:</strong> {file.details.image.width}x
              {file.details.image.height}
            </Paragraph>
            <Paragraph extraClassNames="row">
              <strong>Size:</strong> {prettySize}
            </Paragraph>
            <Paragraph extraClassNames="row">
              <strong>Type:</strong> {file.contentType}
            </Paragraph>
          </main>
          <nav className="buttonset">
            <Button buttonType="muted" extraClassNames="button">
              Edit
            </Button>
            <Button buttonType="muted" extraClassNames="button">
              Remove
            </Button>
          </nav>
        </section>
      </div>
    )
  }
}

function addEventListener(el, events, fn) {
  events.forEach(name => {
    el.addEventListener(name, fn, false)
  })
}

function prevent(e) {
  e.preventDefault()
  e.stopPropagation()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function trimFilename(filename, len) {
  if (filename.length <= MAX_ASSET_TITLE_LEN) {
    return filename
  }

  const basename = filename.replace(/\.\w+$/)
  const extMatch = filename.match(/\.\w+$/)
  const ext = extMatch ? extMatch[0] : ""

  return `${basename.slice(0, MAX_ASSET_TITLE_LEN - ext.length + 1)}${ext}`
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById("root"))
})

if (module.hot) {
  module.hot.accept()
}
