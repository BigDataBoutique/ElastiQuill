import React from 'react';
import classnames from 'classnames';

const FAIcon = props => {
  const { className, icon, ...rest } = props;
  return <i {...rest} className={classnames(className, 'fas', `fa-${icon}`)}/>
};

export default FAIcon;