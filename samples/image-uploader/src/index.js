import React from "react"
import PropTypes from "prop-types"
import ReactDOM from "react-dom"
import "@contentful/forma-36-react-components/dist/styles.css"

import { Spinner } from "@contentful/forma-36-react-components"
import { init } from "contentful-ui-extensions-sdk"
import debounce from "debounce-fn"

import UploadView from "./components/UploadView"
import ProgressView from "./components/ProgressView"
import FileView from "./components/FileView"
import Dropzone from "./components/Dropzone"
import { readFileAsURL, trimFilename } from "./utils"
import { MAX_ASSET_TITLE_LEN } from "./config"

import "./index.css"

class App extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  }

  dropzoneEl = React.createRef()
  state = {
    isDraggingOver: false,
    value: this.props.sdk.field.getValue()
  }

  constructor(props) {
    super(props)
    this.onOtherLocalesChange = debounce(this.onOtherLocalesChange, {
      wait: 1000
    })
  }

  componentWillUpdate() {
    this.setState({
      hideLinkExistingButton: !!this.findExistingAssetReference()
    })
  }

  componentDidMount() {
    this.props.sdk.window.startAutoResizer()

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(
      this.onExternalChange
    )

    this.getOtherLocaleReferences().forEach(ref => {
      this.getRootField().onValueChanged(
        ref.locale,
        this.onOtherLocalesChange.bind(this, ref.locale)
      )
    })

    this.loadLinkedAsset()
  }

  componentWillUpdate(_, nextState) {}

  componentWillUnmount() {
    this.detachExternalChangeHandler()
  }

  onDropFiles = event => {
    event.preventDefault()
    event.stopPropagation()

    // Read the file that was just selected
    const file = Array.prototype.slice.call(
      event.target.files || event.dataTransfer.files
    )[0]

    try {
      this.uploadNewAsset(file)
    } catch (err) {
      this.onError(err)
    }
  }

  onChange = event => {
    const value = event.currentTarget.value
    this.setState({ value })

    if (value) {
      this.props.sdk.field.setValue(value)
    } else {
      this.props.sdk.field.removeValue()
    }
  }

  onClickEdit = () => {
    this.props.sdk.navigator.openAsset(this.state.asset.sys.id, {
      slideIn: true
    })
  }

  onClickLinkExisting = async () => {
    const selectedAsset = await this.props.sdk.dialogs.selectSingleAsset({
      locale: this.props.sdk.field.locale
    })

    if (!selectedAsset) return

    try {
      await this.setFieldLink(selectedAsset.sys.id)
    } catch (err) {
      this.onError(err)
    }
  }

  onClickRemove = () => {
    this.props.sdk.field.setValue(null)
    this.setState({
      value: null,
      asset: null
    })
  }

  onDragOverEnd = () => {
    this.setState({ isDraggingOver: false })
  }

  onDragOverStart = () => {
    this.setState({ isDraggingOver: true })
  }

  onError = error => {
    this.props.sdk.notifier.error(error.message)
  }

  onExternalChange = value => {
    this.setState({ value })
  }

  onOtherLocalesChange = (locale, value) => {
    console.log("[locale change]", locale, value)

    this.loadLinkedAsset()
    this.setState({
      hideLinkExistingButton: this.findExistingAssetReference()
    })
  }

  /*
    Check if an existing Asset was created for another locale, or create a new one.

    ```
    getOrCreateAsset(upload: UploadEntity, file: File) Promise<AssetEntity>
    ```
  */
  createOrUpdateAsset = (upload, file) => {
    const existing = this.findExistingAssetReference()
    if (!existing) {
      return this.createAsset(upload, file)
    }

    return this.props.sdk.space
      .getAsset(existing.value.sys.id)
      .then(asset =>
        this.props.sdk.space.updateAsset(
          this.setAssetUpload(asset, upload, file, this.props.sdk.field.locale)
        )
      )
  }

  /*
     Create a new (unprocessed) asset entry for given upload and file.

     ```
     createAsset(upload: UploadEntity, file: File): Promise<AssetEntity>
     ```
  */
  createAsset = (upload, file) => {
    const emptyAsset = {
      fields: {
        title: {},
        description: {},
        file: {}
      }
    }

    return this.props.sdk.space.createAsset(
      this.setAssetUpload(emptyAsset, upload, file, this.props.sdk.field.locale)
    )
  }

  /*
    An instance of ImageUploader will be rendered for every locale. Instead of
    creating a new asset for each ImageUploader instance, we need to find out an existing
    Asset reference potentially created by another locale.

    ```
    findExistingAssetReference() { value: ReferenceEntity, locale: string, isDefault: boolean } | null
    ```
   */
  findExistingAssetReference = () => {
    const allReferenceValues = this.getOtherLocaleReferences().filter(
      reference => reference.value
    )

    if (allReferenceValues.length === 0) {
      return null
    }

    // If only one reference values found, return that
    if (allReferenceValues.length === 1) {
      return allReferenceValues[0]
    }

    // If there are more than one reference value, it means there is more than 2 locales and min. two locales
    // already points to a reference. In this case, we prioritize the default locale value.
    const defaultReferenceValue = allReferenceValues.filter(
      reference => reference.isDefault
    )[0]
    if (defaultReferenceValue) {
      return defaultReferenceValue
    }

    // If default locale hasn't been set yet, just return the first reference value
    return allReferenceValues[0]
  }

  /*
    Iterate over all locales under the container of the localized fields, map their values to
    an array and filter the current locale.

    ```
    getOtherLocaleReferences() { value: ReferenceEntity, locale: string, isDefault: boolean }[]
    ```
  */
  getOtherLocaleReferences = () => {
    const currentField = this.props.sdk.field
    const rootField = this.getRootField()

    return rootField.locales
      .map(locale => {
        return {
          value: rootField.getValue(locale),
          isDefault: locale === this.props.sdk.locales.default,
          locale
        }
      })
      .filter(field => field.locale !== currentField.locale)
  }

  /*
     Root field refers to the container of all localized instances of ImageUploader.

     `getRootField(): FieldEntity`
   */
  getRootField = () => {
    return this.props.sdk.entry.fields[this.props.sdk.field.id]
  }

  /*
    Does this instance point to the default locale of the container field ?

    ```
    isDefaultLocale() boolean
    ```
  */
  isDefaultLocale = () => {
    const currentField = this.props.sdk.field
    return this.props.sdk.field.locale === this.props.sdk.locales.default
  }

  /*
    Take an asset object, set its required localized file and upload fields. It's used by
    `createAsset` and `createOrUpdateAsset` methods.

    ```
    setAssetUpload(asset: AssetEntity, locale: string, file: HTML5File, upload: UploadEntity): AssetEntity
    ```
   */
  setAssetUpload = (asset, upload, file, locale) => {
    const copy = {
      ...asset
    }

    copy.fields.title[locale] = trimFilename(file.name, MAX_ASSET_TITLE_LEN)
    copy.fields.description[locale] = ""
    copy.fields.file[locale] = {
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

    return copy
  }

  /* Take an HTML5 File object
     that contains the image user selected and performs following tasks;

      * Encode file as a base64 url
      * Upload the image via SDK
      * Create a raw asset object that links to the upload created
      * Send a request to start processing the asset
      * Wait until the asset is processed
      * Publish the asset

     ```
     uploadNewAsset(file: File): void
     ```
  */
  uploadNewAsset = async file => {
    this.setUploadProgress(0)
    this.setState({ file })

    // Encode the file as Base64, so we can pass it through SDK proxy to get it uploaded
    const [base64Prefix, base64Data] = await readFileAsURL(file)
    this.setState({ base64Prefix, base64Data })
    this.setUploadProgress(10)

    // Upload the Base64 encoded image
    const upload = await this.props.sdk.space.createUpload(base64Data)
    this.setUploadProgress(40)

    // Create an unprocessed asset record that links to the upload record created above
    // It reads asset title and filenames from the HTML5 File object we're passing as second parameter
    const rawAsset = await this.createOrUpdateAsset(upload, file)
    this.setUploadProgress(50)

    // Send a request to start processing the asset. This will happen asynchronously.
    await this.props.sdk.space.processAsset(
      rawAsset,
      this.props.sdk.field.locale
    )

    this.setUploadProgress(55)

    // Wait until asset is processed.
    const processedAsset = await this.props.sdk.space.waitUntilAssetProcessed(
      rawAsset.sys.id,
      this.props.sdk.field.locale
    )
    this.setUploadProgress(85)

    // Publish the asset
    try {
      const publishedAsset = await this.props.sdk.space.publishAsset(
        processedAsset
      )
      this.setState({
        asset: publishedAsset
      })
    } catch (err) {
      this.onError(
        new Error("We were not able to publish this asset at this time.")
      )

      this.setState({
        asset: processedAsset
      })
    }

    this.setUploadProgress(95)

    // Set the value of the reference field as a link to the asset created above
    await this.props.sdk.field.setValue({
      sys: {
        type: "Link",
        linkType: "Asset",
        id: processedAsset.sys.id
      }
    })

    this.setUploadProgress(100)
  }

  setFieldLink(assetId) {
    return this.props.sdk.field
      .setValue({
        sys: {
          type: "Link",
          linkType: "Asset",
          id: assetId
        }
      })
      .then(() =>
        this.props.sdk.space
          .getAsset(assetId)
          .then(asset => this.setState({ asset }))
      )
  }

  setUploadProgress(percent) {
    this.setState({
      uploading: percent < 100,
      uploadProgress: percent
    })
  }

  loadLinkedAsset = () => {
    if (!this.state.value) {
      return Promise.resolve()
    }

    return this.props.sdk.space
      .getAsset(this.state.value.sys.id)
      .then(asset => this.setState({ asset }))
      .catch(this.onError)
  }

  render = () => {
    if (this.state.uploading) {
      return (
        <ProgressView
          base64Prefix={this.state.base64Prefix}
          base64Data={this.state.base64Data}
          uploadProgress={this.state.uploadProgress}
        />
      )
    } else if (!this.state.isDraggingOver && this.state.asset) {
      // Display existing asset if user is not dragging over an image
      return (
        <FileView
          file={this.state.asset.fields.file[this.props.sdk.field.locale]}
          isPublished={
            this.state.asset.sys.version ===
            (this.state.asset.sys.publishedVersion || 0) + 1
          }
          isDraggingOver={this.state.isDraggingOver}
          onDrop={this.onDropFiles}
          onDragOverStart={this.onDragOverStart}
          onDragOverEnd={this.onDragOverEnd}
          onClickEdit={this.onClickEdit}
          onClickRemove={this.onClickRemove}
        />
      )
    } else if (!this.state.isDraggingOver && this.state.value) {
      // If `asset` is not set but `value` is, the entry was just opened
      // and we're currently loading the asset value.
      return (
        <main className="spinner viewport centered">
          <Spinner />
        </main>
      )
    }

    return (
      <UploadView
        isDraggingOver={this.state.isDraggingOver}
        onDrop={this.onDropFiles}
        onDragOverStart={this.onDragOverStart}
        onDragOverEnd={this.onDragOverEnd}
        onClickLinkExisting={this.onClickLinkExisting}
        hideLinkExistingButton={this.state.hideLinkExistingButton}
      />
    )
  }
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById("root"))
})

if (module.hot) {
  module.hot.accept()
}
