import React from "react";
import { ToastContainer } from "react-toastify";

export const Layout = props => (
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
