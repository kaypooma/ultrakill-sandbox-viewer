function RegisterOverlayPanel(name) {
  document.getElementById(`${name}-panel`).onanimationend = (event) => {
    if (event.animationName == "panelClose") {
      document.getElementById(`${name}-panel-container`).style.display = 'none';
    }
  };
}

function IsOverlayVisible(panelid) {
  let panel = document.getElementById(`${panelid}-panel`);

  if (panel.classList.contains('uk-panel-open')) {
    return true;
  } else if (panel.classList.contains('uk-panel-close')) {
    return false;
  }
}

function SetOverlayVisible(visible, panelid) {
  let overlay = document.getElementById(`${panelid}-panel-container`);
  let panel = document.getElementById(`${panelid}-panel`);

  if (visible == true) {
    overlay.style.display = 'flex';
    panel.className = "uk-panel uk-panel-open";
  } else {
    panel.className = "uk-panel uk-panel-close";
  }
}
