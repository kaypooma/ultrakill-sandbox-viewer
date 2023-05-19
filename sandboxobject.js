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
    scale = {'x': 1, 'y': 1, 'z': 1};

    frozen = false;

    /* JS doesn't support multiple constructors so I have to do this awfulness */
    constructor(pitrdata, type, id = "") {
        if (type != "block" && type != "enemy" && type != "prop") {
            Log_SObj.Error(`${type} is not a valid object type!`);
            throw new Error("SandboxObject.InvalidType");
        }
        this.type = type;

        if (pitrdata == null) {
            this.newObjectData(id);
        } else {
            this.fromPITRData(pitrdata);
        }
    }

    /* create a brand new SandboxObject of the specified type and id */
    async newObjectData(id) {
        this.id = id;

        await loadObjConfigAsync(id).then((config) => {
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

        if (this.type == "block") {
            this.scale = pitrdata.BlockSize;
        } else {
            this.scale = pitrdata.Scale;
        }

        this.position = pitrdata.Position;
        this.rotation = pitrdata.Rotation;

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
                        if (prop[possibleValueKey] != null) {
                            valueKey = possibleValueKey;
                        }
                    }

                    this.addProp(`${propGroup.Key}/${prop.Key}`, valueKey, prop[valueKey]);
                }
            }
        }
    }

    /* Property/Options */

    addPropGroup(key) {
        // Log_SObj.Info(`Added PropGroup ${key}`);
        this.props[key] = {}
    }

    getPropGroups() {
        return Object.keys(this.props);
    }

    getPropGroupOptions(group) {
        return Object.keys(this.props[group]);
    }

    addProp(keypath, type, defaultValue = null) {
        // Log_SObj.Info(`Added PropOption at path ${keypath}`);
        let keys = keypath.split("/");

        if (this.props[keys[0]]) {
            this.props[keys[0]][keys[1]] = {
                'type': type,
                'value': defaultValue
            }
        } else {
            Log_SObj.Error(`No PropertyGroup named ${keys[0]} exists`);
        }
    }

    getPropValue(keypath) {
        let keys = keypath.split("/");

        if (this.props[keys[0]]) {
            if (this.props[keys[0]][keys[1]]) {
                return this.props[keys[0]][keys[1]].value;
            } else {
                Log_SObj.Error(`No Property named ${keys[1]} exists in PropertyGroup ${keys[0]}`);
            }
        } else {
            Log_SObj.Error(`No PropertyGroup named ${keys[0]} exists`)
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
            Log_SObj.Error(`No Property named ${keys[1]} was found in PropertyGroup ${keys[0]}`);
        }
    }

    /* the (non string form) JSON code you'd find inside of the pitr file */
    getPITRData() {
        let PITRData = {
            'ObjectIdentifier': this.id,
            'Position': this.position,
            'Rotation': this.rotation,
            'Scale': this.scale,
        };

        /* extra specific top level data */
        if (this.type == "block") {
            PITRData.BlockType = 1; // TODO: Implement this properly!
            PITRData.BlockSize = this.scale;
            PITRData.Scale = {'x': 1, 'y': 1, 'z': 1};
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
