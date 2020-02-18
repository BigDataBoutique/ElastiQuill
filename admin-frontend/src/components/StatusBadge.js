import React from "react"
import done from "./../assets/img/done.svg"
import not from "./../assets/img/not.svg"
import error from "./../assets/img/error.svg"
import configured from "./../assets/img/configured.svg"

export default function StatusBadge(props) {

    if(props.status == "success") {
        return (
            <div style={{color: "#09C199", fontsize: 14}}>
                <img
                style={{ height: 18}}
                alt="DONE"
                src={done}
                />{" "}
                DONE
            </div>
        )
    } else if(props.status == "warning") {
        return (
            <div style={{color: "#F7981C", fontsize: 14}}>
                <img
                style={{ height: 18}}
                alt="NOT CONFIGURED"
                src={not}
                />{" "}
                NOT CONFIGURED
            </div>
        )
    } else if(props.status == "configured") {
        return(
        <div style={{color: "#1991EB", fontsize: 14}}>
                <img
                style={{ height: 18}}
                alt="CONFIGURED"
                src={configured}
                />{" "}
                CONFIGURED
            </div>

        )
    }
    return (
        <div style={{color: "#F85359", fontsize: 14}}>
                <img
                style={{ height: 18}}
                alt="ERROR"
                src={error}
                />{" "}
                {props.error ? props.error : "ERROR"}
            </div>
    )

}