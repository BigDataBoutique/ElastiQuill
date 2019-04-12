import React from 'react';
import classnames from 'classnames';

import chalkboardTeacherSolidSvg from './chalkboard-teacher-solid.svg';

export const FAIcon = (props) => {
	if (props.icon == 'chalkboard-teacher') {
		return (
			<i className={classnames(props.className, 'fa')}>
				<img src={chalkboardTeacherSolidSvg} style={{ height: 14 }} />
			</i>			
		)
	}
	return <i className={classnames(props.className, 'fa', `fa-${props.icon}`)}/>
}