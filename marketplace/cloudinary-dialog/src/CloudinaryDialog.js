import React from 'react';
import PropTypes from 'prop-types';

const CLOUDINARY_SDK_URL = 'https://media-library.cloudinary.com/global/all.js';

export default class Dialog extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };

  componentDidMount() {
    this.loadCloudinaryScript();
    this.props.sdk.window.updateHeight();
    // document.addEventListener('BynderAddMedia', e => {
    //   const results = Array.isArray(e.detail) ? e.detail : [];
    //   const assets = results.map(asset => ({
    //     id: asset.id,
    //     src: asset.thumbnails['webimage']
    //   }));
    //   this.props.sdk.close(assets);
    // });
  }

  loadCloudinaryScript() {
    const script = document.createElement('script');
    script.src = CLOUDINARY_SDK_URL;
    script.async = true;
    document.body.appendChild(script);
  }

  render() {
    const { cloudName, apiKey } = this.props.sdk.parameters.invocation;

    // console.log(this.props.sdk.parameters.invocation);

    window.ml = cloudinary.openMediaLibrary(
      {
        cloud_name: cloudName,
        api_key: apiKey,
        inline_container: '.container',
        multiple: true,
        max_files: 8
      },
      {
        insertHandler: function(data) {
          data.assets.forEach(asset => {
            console.log('Inserted asset:', JSON.stringify(asset, null, 2));
          });
        }
      }
    );

    return <div className="container">Hello World</div>;

    // return (
    //   <div className="dialog-container">
    //     <div
    //       id="bynder-compactview"
    //       data-assetTypes="image"
    //       data-autoload="true"
    //       data-button="Load media from bynder.com"
    //       data-collections="true"
    //       data-folder="bynder-compactview"
    //       data-fullScreen="true"
    //       data-header="false"
    //       data-language="en_US"
    //       data-mode="multi"
    //       data-zindex="300"
    //       data-defaultEnvironment={bynderURL}
    //     />
    //   </div>
    // );
  }
}
