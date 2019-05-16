import React from 'react';
import {
  ComposableMap,
  ZoomableGroup,
  Geographies,
  Geography,
  Markers,
  Marker
} from 'react-simple-maps'

import worldMap from '../assets/world-50m.json';

class VisitsMap extends React.Component {
  render() {
    const { mapData } = this.props;
    const maxVisits = mapData.reduce((acc, curr) => Math.max(acc, curr.visits), 0);

    return (
      <ComposableMap
        projectionConfig={{ scale: 205 }}
        width={980}
        height={551}
        style={{
          width: "100%",
          height: "auto",
        }}
        >
        <ZoomableGroup center={[0,20]} disablePanning>
          <Geographies geography={worldMap}>
            {(geographies, projection) =>
              geographies.map((geography, i) =>
                geography.id !== "ATA" && (
                  <Geography
                    key={i}
                    geography={geography}
                    projection={projection}
                    style={{
                      default: {
                        fill: "#ECEFF1",
                        stroke: "#607D8B",
                        strokeWidth: 0.75,
                        outline: "none",
                      },
                      hover: {
                        fill: "#ECEFF1",
                        stroke: "#607D8B",
                        strokeWidth: 0.75,
                        outline: "none",
                      },
                      pressed: {
                        fill: "#ECEFF1",
                        stroke: "#607D8B",
                        strokeWidth: 0.75,
                        outline: "none",
                      },
                    }}
                  />
            ))}
          </Geographies>
          <Markers>
            {mapData.map((bucket, i) => (
              <Marker key={i} marker={{
                name: i,
                coordinates: [bucket.location[1], bucket.location[0]]
              }}>
                <circle
                  cx={0}
                  cy={0}
                  r={10 * bucket.visits / maxVisits}
                  fill="#d9156d"
                  stroke="rgba(217, 21, 109, 0.1)"
                  strokeWidth='2%'
                />
              </Marker>
            ))}
          </Markers>
        </ZoomableGroup>
      </ComposableMap>
    )
  }
}

export default VisitsMap;
