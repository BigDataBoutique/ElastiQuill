import React from 'react';
import GoogleButton from 'react-google-button'
import GitHubLogo from "../assets/img/github-logo.svg";

export const SocialAuthButtons = (props) => {
	if (!props.sources) {
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
		}
	});

	return (
		<div className='row'>
			{btns}
		</div>
	)
};
