import React from 'react';
import ReactDOM from 'react-dom';
import { init, locations } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';
import CloudinaryDialog from './CloudinaryDialog';
import Field from './Field';

init(sdk => {
  if (sdk.location.is(locations.LOCATION_DIALOG)) {
    ReactDOM.render(<CloudinaryDialog sdk={sdk} />, document.getElementById('root'));
  } else {
    ReactDOM.render(<Field sdk={sdk} />, document.getElementById('root'));
  }
});
