import React from 'react';

export default class HoverIcon extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hovered: false
        };
    }

    render() {
        const { hovered } = this.state;
        const Icon = this.props.icon;

        return <Icon
            width='20px'
            height='20px'
            onMouseOver={() => this.setState({ hovered: true })}
            onMouseOut={() => this.setState({ hovered: false })}
            fill={hovered ? '#ea3798' : 'grey'}
            opacity={hovered ? 1 : 0.45}
        />
    }
}