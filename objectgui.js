import names from './data/names.json';
import { Logger } from './logger';
import { MathEx } from './mathex';

const Log_OBJUI = new Logger("ObjectGui");

const ObjectGui = class ObjectGui {
  curObj;
  object; // contains our ui elements
  disabled;

  constructor() {
    this.disabled = {
      'element': document.getElementById('disabled_data'),
    };
    
    this.object = {
      'element': document.getElementById('block_data'),
    }

    // inputs stuff
    this.object.blockInfo = this.object.element.querySelector("#block_type");

    this.object.numberInputs = this.object.element.querySelectorAll('input[type="number"]');
    
    this.object.positionX = this.object.element.querySelector('.position_x');
    this.object.positionY = this.object.element.querySelector('.position_y');
    this.object.positionZ = this.object.element.querySelector('.position_z');

    this.object.scaleInputs = this.object.element.querySelectorAll('.scale');
    this.object.scaleX = this.object.element.querySelector('#scale_x');
    this.object.scaleY = this.object.element.querySelector('#scale_y');
    this.object.scaleZ = this.object.element.querySelector('#scale_z');

    this.object.rotationInputs = this.object.element.querySelectorAll('.rotation');
    this.object.rotationX = this.object.element.querySelector('#rotation_x');
    this.object.rotationY = this.object.element.querySelector('#rotation_y');
    this.object.rotationZ = this.object.element.querySelector('#rotation_z');
    
    this.object.toggleInputs = this.object.element.querySelectorAll('input[type="checkbox"]');
    this.object.frozenToggle = this.object.element.querySelector('#block_frozen');
    this.object.weakToggle = this.object.element.querySelector('#block_weak');
    this.object.unbreakableToggle = this.object.element.querySelector('#block_unbreakable');

    Log_OBJUI.Info("Successfully initialized ObjectGui");
  }

  disableGUI() {
    let guiElements = document.querySelectorAll('.object_data_container');
    for (let el of guiElements) {
      el.classList.add('hidden');
    }

    this.disabled.element.classList.remove('hidden');
  }

  updateGUI(obj) {
    let guiElements = document.querySelectorAll('.object_data_container');
    for (let el of guiElements) {
      el.classList.add('hidden');
    }

    switch (obj.userData.objectType) {
      case 'block':
      case 'prop':
        this.curObj = obj;
        this.updateObjectGUI();
        break;
      default:
        Log_OBJUI.Error(`Unrecognized object type ${obj.userData.objectType}`);
    }
  }

  updateObjectGUI() {
    let data = this.curObj.userData.objectData;
    
    if (!data) {
      Log_OBJUI.Error("curObj does not contain valid objectData");
      return;
    }

    let scale = this.curObj.userData.objectType === 'block' ? data.BlockSize : data.Scale;

    this.object.element.classList.remove('hidden');
    
    this.object.blockInfo.innerText = names[data.ObjectIdentifier];

    this.object.positionX.value = data.Position.x;
    this.object.positionY.value = data.Position.y;
    this.object.positionZ.value = data.Position.z;

    this.object.scaleX.value = scale.x;
    this.object.scaleY.value = scale.y;
    this.object.scaleZ.value = scale.z;

    let eulerRotation = MathEx.fromUnityQuaternion(data.Rotation.x, data.Rotation.y, data.Rotation.z, data.Rotation.w);

    this.object.rotationX.value = eulerRotation.x;
    this.object.rotationY.value = eulerRotation.y;
    this.object.rotationZ.value = eulerRotation.z;

    this.object.frozenToggle.checked = data.Kinematic;
    
    if (data.Data) {
      this.object.weakToggle.disabled = false;
      this.object.weakToggle.checked = data.Data[0].Options[0].BoolValue;
      
      this.object.unbreakableToggle.disabled = false;
      this.object.unbreakableToggle.checked = data.Data[0].Options[1].BoolValue;
    } else {
      this.object.weakToggle.disabled = true;
      this.object.weakToggle.checked = false;

      this.object.unbreakableToggle.disabled = true;
      this.object.unbreakableToggle.checked = false;
    }
  }
}

export { ObjectGui };
