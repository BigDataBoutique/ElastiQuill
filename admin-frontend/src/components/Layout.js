import React from 'react';
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export const Layout = (props) => (
	<>
		<ToastContainer
			position="top-center"
			autoClose={5000}
			hideProgressBar
			closeOnClick
			pauseOnHover
			draggable
			draggablePercent={0}
		/>
		{props.children}
	</>
);
