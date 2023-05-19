import names from './data/names.json';
import Logger from './logger';
import MathEx from './mathex';

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

    this.object.element.classList.remove('hidden');

    this.object.blockInfo.innerText = names[data.id];

    this.object.positionX.value = data.position.x;
    this.object.positionY.value = data.position.y;
    this.object.positionZ.value = data.position.z;

    this.object.scaleX.value = data.scale.x;
    this.object.scaleY.value = data.scale.y;
    this.object.scaleZ.value = data.scale.z;

    let eulerRotation = MathEx.fromUnityQuaternion(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w);

    this.object.rotationX.value = eulerRotation.x;
    this.object.rotationY.value = eulerRotation.y;
    this.object.rotationZ.value = eulerRotation.z;

    this.object.frozenToggle.checked = data.frozen;

    if (data.getPropGroups().includes("breakable")) {
      this.object.weakToggle.disabled = false;
      this.object.weakToggle.checked = data.getPropValue("breakable/weak");

      this.object.unbreakableToggle.disabled = false;
      this.object.unbreakableToggle.checked = data.getPropValue("breakable/unbreakable");
    } else {
      this.object.weakToggle.disabled = true;
      this.object.weakToggle.checked = false;

      this.object.unbreakableToggle.disabled = true;
      this.object.unbreakableToggle.checked = false;
    }
  }
}

export default ObjectGui;
