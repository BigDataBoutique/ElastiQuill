import React, { Component } from "react";
import PropTypes from "prop-types";

class FacebookShareButton extends Component {
  constructor(props) {
    super(props);
    this._share = this._share.bind(this);
  }

  render() {
    const Component = this.props.as;
    return <Component onClick={this._share}>{this.props.children}</Component>;
  }

  async _init() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const { appId } = this.props;
    this.loadingPromise = new Promise(resolve => {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: "v6.0",
        });

        resolve(window.FB);
      };

      if (window.document.getElementById("facebook-jssdk")) {
        return resolve(window.FB);
      }

      const script = window.document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.src = "https://connect.facebook.net/en_US/sdk.js";

      window.document.body.appendChild(script);
    });

    return this.loadingPromise;
  }

  async _share() {
    const FB = await this._init();
    FB.ui(
      {
        method: "share",
        href: this.props.url,
        quote: this.props.quote,
        hashtag: this.props.hashtag,
      },
      () => {}
    );
  }
}

FacebookShareButton.propTypes = {
  appId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  url: PropTypes.string.isRequired,
};

export default FacebookShareButton;
