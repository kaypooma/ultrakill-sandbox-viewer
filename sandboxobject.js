/*
    stores all data about an object in UK sandbox save data

    this provides an easy method to handle properties and any other
    object specific data for creation
*/

import Logger from './logger';

import * as THREE from 'three';
import { FileLoader } from 'three';

const Log_SObj = new Logger("SandboxObject");

const manager = new THREE.LoadingManager();
const loader = new FileLoader( manager );

const valueKeys = [
    "FloatValue",
    "BoolValue"
];

const vkToType = {
    "FloatValue": "number",
    "BoolValue": "boolean",
};

const loadObjConfigAsync = ( id ) => {
    return new Promise( resolve => {
        Log_SObj.Info(`Loading config file for Object '${id}'`);
        let url = `config/objects/${id}.json`;
        loader.load( url, cfg => {
            resolve( cfg );
        }, 

        (xhr) => {}, 

        (err) => {
            Log_SObj.Warn(`No object config was found for type ${id}. Was a new object added to the game?`);
        });
    });
}

const SandboxObject = class SandboxObject {
    rawdata;

    id;
    type;
    props = {};

    position = {'x': 0, 'y': 0, 'z': 0};
    rotation = {'x': 0, 'y': 0, 'z': 0, 'w': 0};
    scale = {'x': 0, 'y': 0, 'z': 0};

    frozen = false;

    blockSize;

    /* JS doesn't support multiple constructors so I have to do this awfulness */
    constructor(pitrdata, id = "", type = "") {
        if (pitrdata == null) {
            this.newObjectData(id, type);
        } else {
            this.fromPITRData(pitrdata);
        }
    }

    /* create a brand new SandboxObject of the specified type and id */
    newObjectData(id, type) {
        this.id = id;
        this.type = type;

        loadObjConfigAsync(id).then((config) => {
            let objcfg = JSON.parse(config);
            
            for (let [key, options] of Object.entries(objcfg.Props)) {
                this.addPropGroup(key);

                for (let [opt_key, opt_info] of Object.entries(options)) {
                    this.addProp(`${key}/${opt_key}`, opt_info.type, opt_info.defaultValue);
                }
            }
        });
    }

    /* construct a SandboxObject from existing data (i.e. a save file) */
    fromPITRData(pitrdata) {
        this.id = pitrdata.ObjectIdentifier;

        if (pitrdata.BlockSize) {
            this.blockSize = pitrdata.BlockSize;
        }

        this.position = pitrdata.Position;
        this.rotation = pitrdata.Rotation;
        this.scale = pitrdata.Scale;

        // parse existing data
        if (pitrdata['Data']) {
            // it's significantly faster parse properties into a non array as that cuts back on the for loops needed
            // to find the location of a property as array positions might not be consistent between ULTRAKILL versions
            // or even files in some cases.
            for (var propGroup of pitrdata['Data']) {
                this.addPropGroup(propGroup.Key);

                for (var prop of propGroup.Options) {
                    // fun
                    let valueKey;
                    for (var possibleValueKey of valueKeys) {
                        if (prop[valueKey] != null) {
                            valueKey = possibleValueKey;
                        }
                    }

                    this.addProp(`${propGroup.Key}/${prop.Key}`, valueKey);
                }
            }
        }
    }

    /* Property/Options */

    addPropGroup(key) {
        Log_SObj.Info(`Added PropGroup ${key}`);
        this.props[key] = {}
    }

    getPropGroups() {
        return Object.keys(this.props);
    }

    getPropGroupOptions(group) {
        return Object.keys(this.props[group]);
    }

    addProp(keypath, type, defaultValue = null) {
        Log_SObj.Info(`Added PropOption at path ${keypath}`);
        let keys = keypath.split("/");

        this.props[keys[0]][keys[1]] = {
            'type': type,
            'value': defaultValue
        }
    }

    getPropValue(keypath) {
        let keys = keypath.split("/");

        if (this.props[keys[0]][keys[1]]) {
            return this.props[keys[0]][keys[1]].value;
        } else {
            Log_SObj.Error(`No property at ${keypath} was found`);
        }
    }

    setPropValue(keypath, value) {
        let keys = keypath.split("/");

        if (this.props[keys[0]][keys[1]]) {
            let opt = this.props[keys[0]][keys[1]];
            if (typeof value == vkToType[opt.type]) {
                opt.value = value;
            }
            Log_SObj.Error(`Expected ${opt.type} got ${typeof value}`);
        } else {
            Log_SObj.Error(`No property at ${keypath} was found`);
        }
    }

    /* the (non string form) JSON code you'd find inside of the pitr file */
    getPITRData() {
        let PITRData = {
            'ObjectIdentifier': this.id,
            'Position': this.position,
            'Rotation': this.rotation,
            'Scale': this.scale
        };

        /* extra specific top level data */
        if (this.type == "block") {
            PITRData.BlockSize = this.blockSize;
        }

        /* property groups */
        PITRData.Data = []
        for (let [key, options] of Object.entries(this.props)) {
            let propData = {'Key': key, 'Options': []};

            for (let [opt_key, opt_data] of Object.entries(options)) {
                let opt = {
                    'Key': opt_key
                };
                opt[opt_data.type] = opt_data.value;
                propData.Options.push(opt);
            }
            PITRData.Data.push(propData);
        }

        return PITRData
    }
}

export default SandboxObject;
