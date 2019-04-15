import React from 'react';
import GoogleButton from 'react-google-button'
import GitHubLogo from "../assets/img/github-logo.svg";

export default function(props) {
  if (! props.sources) {
    return false;
  }

  const btns = props.sources.map(source => {
    if (source === 'github') {
      return (
        <div key="github" className='col-md' style={{textAlign: 'center'}}>
          <a className="btn btn-secondary mb-3 mb-md-0" style={{
            padding: "10px 20px",
            textTransform: "none"
          }} href='/api/auth/github'>
            <img style={{height: 30, marginRight: 5}} alt='Sign in with Github'
               src={GitHubLogo}/> Sign in with GitHub
          </a>
        </div>
      )
    } else if (source === 'google') {
      return (
        <div key="google" className='col-md'>
          <GoogleButton onClick={() => location.href = '/api/auth/google'}/>
        </div>
      )
    } else if (source === 'anonymous') {
      return (
        <div key="anonymous" className='col-md'>
          <a href='/api/auth/anonymous' className='btn btn-primary'>Login</a> 
        </div>
      )
    }
  });

  return (
    <div>
      {props.sources.indexOf('anonymous') > -1 && (
        <div className='alert alert-warning'>
          <div style={{ fontSize: '18px', textAlign: 'center', marginBottom: 10 }}>Warning: admin screen is publicly accessible</div>
          Authorization to admin screen via single sign-on is not configured.
          To configure authorization, check <pre>README.md</pre> file.
        </div>
      )}
      <div className='row'>
        {btns}
      </div>
    </div>
  )
};
