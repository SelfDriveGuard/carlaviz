// Copyright (c) 2019 Uber Technologies, Inc. 
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* global document, console */
/* eslint-disable no-console, no-unused-vars, no-undef */
import React, { PureComponent } from "react";
import { render } from "react-dom";

import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import {
  LogViewer,
  StreamSettingsPanel,
  MeterWidget,
  XVIZPanel,
  XVIZLiveLoader,
  VIEW_MODE
} from "streetscape.gl";
import { Form, ThemeProvider } from "@streetscape.gl/monochrome";

import { APP_SETTINGS, XVIZ_STYLE, CAR, UI_THEME } from "./constants";

import githubIcon from "../public/github_icon.png";

import "./index.css";

const carlaLog = new XVIZLiveLoader({
  logGuid: "mock",
  bufferLength: 10,
  serverConfig: {
    defaultLogLength: 50,
    // serverUrl: "ws://" + __HOST_IP__ + ":8081",
    serverUrl: "ws://" + __HOST_IP__ + ":8091"
  },
  worker: true,
  maxConcurrency: 10
});

const tableComponentProps = {
  table: {
    height: 120
  }
};
class CarlaViz extends PureComponent {
  state = {
    log: carlaLog,
    metadataReceived: false,
    settings: {
      viewMode: "PERSPECTIVE",
      showTooltip: true
    },
    showHover: false,
    hoverObject: {
        roadId: '',
        laneId: '',
        x:0,
        y:0
    }
  };

  _onLayerHover = (info) => {
      if(info.object){
        this.setState({
          hoverObject: {
            roadId: info.object.properties.name,
            laneId: info.object.properties.laneId,
            x: info.x,
            y: info.y
          },
          showHover: true
        });
      }else {
        this.setState({
          showHover: false
        });
      }
  };

  componentDidMount() {
    const { log } = this.state;
    log
      .on("ready", () => {
        const metadata = log.getMetadata();
        log.socket.onclose = () => {
          this.setState({
            metadataReceived: false
          });
        };
        if (metadata.map) {
          const mapLayer = new GeoJsonLayer({
            coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
            coordinateOrigin: [0, 0, 0],
            id: "carla_map",
            data: metadata.map,
            stroked: true,
            filled: true,
            wireframe: true,
            extruded: true,
            getFillColor: [255, 255, 255, 255],
            getLineColor: [255, 255, 255, 255],
            getLineWidth: 0.1,
            getRadius: 0.00001,
            opacity: 10,
            pickable: true,
            onClick: info => this._onLayerHover(info),
            onHover: info => this._onLayerHover(info)
          });

          const textLayer = new TextLayer({
            id: 'text-layer',
            data: metadata.map.features,
            billboard: false,
            fontFamily: 'sans-serif',
            sizeUnits: 'meters',
            coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
            coordinateOrigin: [0, 0, 0], 
            pickable: true,
            getPosition: d => d.geometry.coordinates[1],
            getText: d => d.properties.name,
            getColor: [255, 255, 0, 255],
            getSize: 0.3,
            getAngle: 0,
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'center',          
          });

          this.setState({
            map: mapLayer,
            textLayer: textLayer,
            metadataReceived: true
          });
          console.log("get map");
        } else {
          this.setState({
            metadataReceived: true
          });
          console.log("receive metadata without map");
        }
      })
      .on("error", console.error)
      .connect();
  }

  _onSettingsChange = changedSettings => {
    this.setState({
      settings: { ...this.state.settings, ...changedSettings }
    });
  };

  _onStreamSettingChange = changedSettings => {
    const { log } = this.state;
    if (log && log.isOpen()) {
      log.socket.send(JSON.stringify(changedSettings));
    } else {
      console.log("socket is closed");
    }
  };

  render() {
    const { log, map, metadataReceived, settings, textLayer, hoverObject, showHover } = this.state;
    let customLayers = [];
    if(map && textLayer){
      customLayers = [map, textLayer];
    }else if(map){
      customLayers = [map];
    }

    return (
      <div id="container">
        <div id="control-panel">
          <div id="github">
            <p>
              <a href="https://github.com/wx9698/carlaviz" target="_blank">
                CarlaViz
              </a>
            </p>
            <a href="https://github.com/wx9698/carlaviz" target="_blank">
              <img src={githubIcon}></img>
            </a>
          </div>
          {metadataReceived ? (
            <div>
              <hr id="github-hr" />
              <XVIZPanel log={log} name="Metrics" />
              <hr />
              <XVIZPanel log={log} name="Camera" />
              <hr />
              <XVIZPanel
                log={log}
                name="Tables"
                componentProps={tableComponentProps}
              />
              <hr />
              <Form
                data={APP_SETTINGS}
                values={this.state.settings}
                onChange={this._onSettingsChange}
              />
              <StreamSettingsPanel
                log={log}
                onSettingsChange={this._onStreamSettingChange}
              />
            </div>
          ) : (
            <div>
              <h4>Launch the backend and refresh</h4>
            </div>
          )}
        </div>
        <div id="log-panel">
          <div id="map-view">
            <LogViewer
              log={log}
              showMap={false}
              car={CAR}
              xvizStyles={XVIZ_STYLE}
              showTooltip={settings.showTooltip}
              viewMode={VIEW_MODE[settings.viewMode]}
              customLayers={customLayers}
            />
            <div style={{
                position: "absolute",
                zIndex: 1000,
                background: "#ffffff",
                pointerEvents: "none",
                padding: "0 5px",
                left: 0,
                top: 0
              }} >
                <h4>roadId:{hoverObject.roadId}</h4>
                <h4>laneId:{hoverObject.laneId}</h4>
            </div>
            {showHover ? (
              <div style={{
                position: "absolute",
                zIndex: 1000,
                background: "#333333",
                color: "#ffffff",
                pointerEvents: "none",
                borderRadius: "5px",
                padding: "0 5px",
                left: hoverObject.x,
                top: hoverObject.y
              }} >
                <p>roadId:{hoverObject.roadId}</p>
                <p>laneId:{hoverObject.laneId}</p>
            </div>
            ) : (
              <div></div>
            )}

            {metadataReceived ? (
              <div id="hud">
                <MeterWidget
                  log={log}
                  streamName="/vehicle/acceleration"
                  label="Acceleration"
                  min={-10}
                  max={10}
                />
                <hr />
                <MeterWidget
                  log={log}
                  streamName="/vehicle/velocity"
                  label="Speed"
                  getWarning={x => (x > 6 ? "FAST" : "")}
                  min={0}
                  max={20}
                />
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </div>
        <div id="author-info">
          <p>Author: Minjun Xu</p>
        </div>
      </div>
    );
  }
}

render(
  <ThemeProvider theme={UI_THEME}>
    <CarlaViz />
  </ThemeProvider>,
  document.getElementById("app")
);
