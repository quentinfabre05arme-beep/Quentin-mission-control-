class SmartHome {
  constructor() {
    this.devices = []; }
  addDevice(name, type) {
    this.devices.push({ name, type }); }
  control(name, state) {
    return { device: name, state }; }
}

module.exports = { SmartHome };