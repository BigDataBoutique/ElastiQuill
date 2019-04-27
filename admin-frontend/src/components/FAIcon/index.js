import React from 'react';
import classnames from 'classnames';

export const FAIcon = (props) => {
	return <i className={classnames(props.className, 'fas', `fa-${props.icon}`)}/>
}