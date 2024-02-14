class DrumTrack {
  constructor (name, length) {
    this.name = name
    this.data = []
    this.length = length || 16
    this.initTrack(this.length)
    const file = `./audio/${name}/01.wav`
    this.initData(file)
  }
  async initData (file) {
    const res = await fetch(file)
    const reader = res.body.getReader()
    while (true) {
      const data = await reader.read()
      if (data.value) this.data = this.data.concat(Array.from(data.value))
      if (data.done) break
    }
    this.data = this.data.slice(44)
  }
  initTrack (length) {
    this.track = []
    for (let i = 0; i < length; ++i) {
      this.track.push(false)
    }
  }
  updateTrackIndex (index) {
    this.track[index] = ! this.track[index]
    return this.track[index]
  }
  getName() {
    return this.name
  }
  getTrack() {
    return this.track
  }
  getLength() {
    return this.length
  }
  getBytes() {
    return this.data
  }
  destroy() {
    this.name = null
    this.data = null
    this.track = null
    this.length = null
  }
}
class InstrumentTrack {
  constructor (name, length, base) {
    this.name = name
    this.data = []
    this.length = length || 16
    this.base = base || 'c4'
    this.initTrack(this.length)
    const file = `./audio/${name}/${this.base}.wav`
    this.initData(file)
  }
  async initData (file) {
    const res = await fetch(file)
    const reader = res.body.getReader()
    while (true) {
      const data = await reader.read()
      if (data.value) this.data = this.data.concat(Array.from(data.value))
      if (data.done) break
    }
    this.data = this.data.slice(44)
  }
  initTrack (length) {
    this.track = {}
    for (let k in asafonov.notes) {
      this.track[k] = []    
      for (let i = 0; i < length; ++i) {
        this.track[k].push(false)
      }
    }
  }
  updateTrackIndex (key, index) {
    this.track[key][index] = ! this.track[key][index]
    return this.track[key][index]
  }
  getName() {
    return this.name
  }
  getTrack() {
    return this.track
  }
  getLength() {
    return this.length
  }
  getBytes (note) {
    if (note === this.base)
      return this.data
    if (! asafonov.notes[note]) return []
    const ratio = asafonov.notes[this.base] / asafonov.notes[note]
    return asafonov.waveUtils.pitch(this.data, ratio)
  }
  destroy() {
    this.name = null
    this.data = null
    this.track = null
    this.base = null
    this.length = null
  }
}
class MessageBus {
  constructor() {
    this.subscribers = {};
  }
  send (type, data) {
    if (this.subscribers[type] !== null && this.subscribers[type] !== undefined) {
      for (var i = 0; i < this.subscribers[type].length; ++i) {
        this.subscribers[type][i]['object'][this.subscribers[type][i]['func']](data);
      }
    }
  }
  subscribe (type, object, func) {
    if (this.subscribers[type] === null || this.subscribers[type] === undefined) {
      this.subscribers[type] = [];
    }
    this.subscribers[type].push({
      object: object,
      func: func
    });
  }
  unsubscribe (type, object, func) {
    for (var i = 0; i < this.subscribers[type].length; ++i) {
      if (this.subscribers[type][i].object === object && this.subscribers[type][i].func === func) {
        this.subscribers[type].slice(i, 1);
        break;
      }
    }
  }
  unsubsribeType (type) {
    delete this.subscribers[type];
  }
  destroy() {
    for (type in this.subscribers) {
      this.unsubsribeType(type);
    }
    this.subscribers = null;
  }
}
const notes = {
  c4: 26163,
  c_4: 27718,
  d4: 29366,
  d_4: 31113,
  e4: 32963,
  f4: 34923,
  f_4: 36999,
  g4: 39200,
  g_4: 41530,
  a4: 44000,
  a_4: 46616,
  b4: 49388
}
class Updater {
  constructor (upstreamVersionUrl) {
    this.upstreamVersionUrl = upstreamVersionUrl
  }
  getCurrentVersion() {
    return window.asafonov.version
  }
  getUpstreamVersion() {
    return fetch(this.upstreamVersionUrl)
      .then(data => data.text())
      .then(data => data.replace(/[^0-9\.]/g, ''))
  }
  compareVersion (v1, v2) {
    const _v1 = v1.split('.').map(i => parseInt(i, 10))
    const _v2 = v2.split('.').map(i => parseInt(i, 10))
    let ret = false
    for (let i = 0; i < _v1.length; ++i) {
      if (_v1[i] !== _v2[i]) {
        ret = _v1[i] > _v2[i]
        break
      }
    }
    return ret
  }
  getUpdateUrl (template) {
    return template.replace('{VERSION}', this.upstreamVersion)
  }
  isUpdateNeeded() {
    return this.getUpstreamVersion().
      then(upstreamVersion => {
        this.upstreamVersion = upstreamVersion
        const currentVersion = this.getCurrentVersion()
        return this.compareVersion(upstreamVersion, currentVersion)
      })
  }
}
const waveUtils = {
  audio: new Audio(),
  normalize: v => v >= 0 ? Math.min(v, 256 * 128 - 1) : Math.max(v, -256 * 128 + 1) + 256 * 256 -1,
  formatSize: size => {
    const ret = [size % 256]
    ret.push((size - ret[0]) / 256 % 256)
    ret.push((size - ret[0] - ret[1] * 256) / 256 / 256 % 256)
    ret.push((size - ret[0] - ret[1] * 256 - ret[2] * 256 * 256) / 256 / 256 / 256 % 256)
    return ret
  },
  pitch: (wav, ratio) => {
    const bytesPerStep = 2
    let p = 0
    let i = 0
    const ret = []
    while (i < wav.length) {
      const n = parseInt(i / bytesPerStep * (1 - ratio))
      if (n > p) {
        p = n
      } else {
        for (let j = 0; j < bytesPerStep; ++j)
          ret.push(wav[i + j])
      }
      i += bytesPerStep
    }
    return ret
  },
  getWavHeader: length => {
    return [82, 73, 70, 70,
          ...waveUtils.formatSize(length + 44),
          87, 65, 86, 69,
          102, 109, 116, 32,
          16, 0, 0, 0,
          1, 0, 2, 0,
          68, 172, 0, 0,
          16, 177, 2, 0,
          4, 0, 16, 0,
          100, 97, 116, 97,
          ...waveUtils.formatSize(length)]
  },
  mixWavs: (wavs, starts) => {
    wavs = wavs.filter(i => i && i.length > 0)
    if (starts === null || starts === undefined) starts = []
    let length = 0
    for (let i = 0; i < wavs.length; ++i) {
      length = Math.max(wavs[i].length + (starts[i] || 0), length)
    }
    let i = 0
    const ret = []
    while (i < length - 1) {
      let res = 0
      for (let j = 0; j < wavs.length; ++j) {
        const b0 = ! starts[j] || i >= starts[j] ? wavs[j][i - (starts[j] || 0)] || 0 : 0
        const b1 = ! starts[j] || i >= starts[j] ? wavs[j][i + 1 - (starts[j] || 0)] || 0 : 0
        let v = b0 + b1 * 256
        if (v > 256 * 128 - 1) v = v - 256*256 + 1
        res += v
      }
      res = waveUtils.normalize(res)
      const first = res % 256
      const second = (res - first) / 256
      ret.push(first)
      ret.push(second)
      i += 2
    }
    return ret
  },
  play: bytes => {
    if (bytes !== null && bytes !== undefined) {
      const buffer = new Uint8Array(bytes.length + 44)
      buffer.set(new Uint8Array([...waveUtils.getWavHeader(bytes.length), ...bytes]), 0)
      const blob = new Blob([buffer], {type: 'audio/wav'})
      const url = URL.createObjectURL(blob)
      waveUtils.audio.src = url
    }
    waveUtils.audio.play()
  }
}
class DrumTrackController {
  constructor (name, length) {
    this.model = new DrumTrack(name, length)
    this.addEventListeners()
  }
  addEventListeners() {
    asafonov.messageBus.subscribe(asafonov.events.TRACK_VIEW_UPDATED, this, 'onTrackViewUpdate')
  }
  removeEventListeners() {
    asafonov.messageBus.unsubscribe(asafonov.events.TRACK_VIEW_UPDATED, this, 'onTrackViewUpdate')
  }
  play() {
    asafonov.waveUtils.play(this.model.getBytes())
  }
  onTrackViewUpdate (data) {
    if (data.name !== this.model.getName()) {
      return
    }
    this.play()
    this.model.updateTrackIndex(data.index)
    asafonov.messageBus.send(asafonov.events.TRACK_MODEL_UPDATED, data)
  }
  isOn (index) {
    return this.model.getTrack()[index]
  }
  getTrack() {
    const bitLength = 44100 * 60 / asafonov.settings.tempo
    const length = this.model.getTrack().length
    const wavs = []
    const starts = []
    for (let i = 0; i < length; ++i) {
      if (this.isOn(i)) {
        wavs.push(this.model.getBytes())
        starts.push(i * bitLength)
      }
    }
    if (wavs.length === 0) return
    return asafonov.waveUtils.mixWavs(wavs, starts)
  }
  getModel() {
    return this.model
  }
  destroy() {
    this.removeEventListeners()
    this.model.destroy()
    this.model = null
  }
}
class DrumTrackListController {
  constructor () {
    this.tracks = []
    this.mix = []
    this.addEventListeners()
  }
  addEventListeners() {
    asafonov.messageBus.subscribe(asafonov.events.IS_PLAYING_UPDATED, this, 'onIsPlayingUpdate')
  }
  removeEventListeners() {
    asafonov.messageBus.unsubscribe(asafonov.events.IS_PLAYING_UPDATED, this, 'onIsPlayingUpdate')
  }
  getInterval() {
    return 60 / asafonov.settings.tempo / 4 * 1000
  }
  addTrackController (controller) {
    this.tracks.push(controller)
  }
  mixList() {
    const tracks = []
    for (let i = 0; i < this.tracks.length; ++i) {
      tracks.push(this.tracks[i].getTrack())
    }
    return asafonov.waveUtils.mixWavs(tracks)
  }
  onIsPlayingUpdate ({isPlaying, loop}) {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    if (! isPlaying) return
    this.timeout = setTimeout(() => this.onIsPlayingUpdate({isPlaying, loop: true}), this.getInterval() * 16)
    if (loop) return asafonov.waveUtils.play()
    asafonov.waveUtils.play(this.mixList())
  }
  destroy() {
    this.removeEventListeners()
    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = null
    this.tracks = null
    this.mix = null
  }
}
class InstrumentTrackController {
  constructor (name, length) {
    this.model = new InstrumentTrack(name, length)
    this.addEventListeners()
  }
  addEventListeners() {
    asafonov.messageBus.subscribe(asafonov.events.TRACK_VIEW_UPDATED, this, 'onTrackViewUpdate')
  }
  removeEventListeners() {
    asafonov.messageBus.unsubscribe(asafonov.events.TRACK_VIEW_UPDATED, this, 'onTrackViewUpdate')
  }
  play (note) {
    const data = this.model.getBytes(note)
    asafonov.waveUtils.play(data)
  }
  onTrackViewUpdate (data) {
    if (data.name !== this.model.getName()) {
      return
    }
    this.play(data.note)
    this.model.updateTrackIndex(data.note, data.index)
    asafonov.messageBus.send(asafonov.events.TRACK_MODEL_UPDATED, data)
  }
  isOn (note, index) {
    return this.model.getTrack()[note][index]
  }
  getTrack() {
    const wavs = []
    for (let k in asafonov.notes) {
      wavs.push(this.getNoteTrack(k))
    }
    return asafonov.waveUtils.mixWavs(wavs)
  }
  getNoteTrack(note) {
    const bitLength = 44100 * 60 / asafonov.settings.tempo
    const length = this.model.getTrack()[note].length
    const wavs = []
    const starts = []
    for (let i = 0; i < length; ++i) {
      if (this.isOn(i)) {
        wavs.push(this.model.getBytes(note))
        starts.push(i * bitLength)
      }
    }
    if (wavs.length === 0) return
    return asafonov.waveUtils.mixWavs(wavs, starts)
  }
  getModel() {
    return this.model
  }
  destroy() {
    this.removeEventListeners()
    this.model.destroy()
    this.model = null
  }
}
class ControlView {
  constructor (name, parentContainer) {
    this.name = name
    this.container = document.createElement('div')
    this.container.classList.add('icon')
    this.container.classList.add(`icon_${name}`)
    this.container.classList.add(this.getClassByIsPlaying())
    this.container.innerHTML = this.getIcon()
    parentContainer.appendChild(this.container)
    this.onControlClickedProxy = this.onControlClicked.bind(this)
    this.addEventListeners()
  }
  getIcon() {
    if (this.name === 'play') return '▶'
    if (this.name === 'pause') return '❙&#8201;❙'
    if (this.name === 'stop') return '■'
  }
  addEventListeners() {
    this.container.addEventListener('click', this.onControlClickedProxy)
    asafonov.messageBus.subscribe(asafonov.events.IS_PLAYING_UPDATED, this, 'onIsPlayingUpdate')
  }
  removeEventListeners() {
    this.container.removeEventListener('click', this.onControlClickedProxy)
    asafonov.messageBus.unsubscribe(asafonov.events.IS_PLAYING_UPDATED, this, 'onIsPlayingUpdate')
  }
  onControlClicked() {
    asafonov.messageBus.send(asafonov.events.IS_PLAYING_UPDATED, {isPlaying: this.name === 'play'})
  }
  getClassByIsPlaying (isPlaying) {
    if (isPlaying) {
      return this.name === 'play' ? 'icon_off' : 'icon_on'
    }
    return this.name === 'play' ? 'icon_on' : 'icon_off'
  }
  onIsPlayingUpdate (data) {
    this.container.classList.remove('icon_on')
    this.container.classList.remove('icon_off')
    this.container.classList.add(this.getClassByIsPlaying(data.isPlaying))
  }
  destroy() {
    this.removeEventListeners()
    this.container = null
    this.name = null
  }
}
class ControlListView {
  constructor (list) {
    this.container = document.querySelector('.controls')
    for (let i = 0; i < list.length; ++i) {
      const view = new ControlView(list[i], this.container)
    }
  }
}
class DrumTrackView {
  constructor (name, color, parentContainer) {
    this.controller = new DrumTrackController(name)
    this.container = document.createElement('div')
    this.container.classList.add('row')
    this.container.classList.add('notes_row')
    parentContainer.appendChild(this.container)
    this.initName()
    this.initTrack(color)
    this.addEventListeners()
  }
  addEventListeners() {
    asafonov.messageBus.subscribe(asafonov.events.TRACK_MODEL_UPDATED, this, 'onTrackModelUpdate')
  }
  removeEventListeners() {
    asafonov.messageBus.unsubscribe(asafonov.events.TRACK_MODEL_UPDATED, this, 'onTrackModelUpdate')
  }
  getController() {
    return this.controller
  }
  initName() {
    this.nameContainer = document.createElement('div')
    this.nameContainer.classList.add('col')
    this.nameContainer.classList.add('names_col')
    this.nameContainer.classList.add('name')
    this.nameContainer.innerHTML = this.controller.getModel().getName()
    this.container.appendChild(this.nameContainer)
  }
  initTrack (color) {
    this.trackContainer = document.createElement('div')
    this.trackContainer.classList.add('col')
    this.trackContainer.classList.add('notes_col')
    this.trackContainer.classList.add(`${color}_color`)
    this.container.appendChild(this.trackContainer)
    const track = this.controller.getModel().getTrack()
    for (let i = 0; i < track.length; ++i) {
      const div = document.createElement('div')
      div.className = 'note'
      div.classList.add(`note_o${track[i] ? 'n' : 'ff'}`)
      div.addEventListener('click', () => {
        asafonov.messageBus.send(asafonov.events.TRACK_VIEW_UPDATED, {name: this.controller.getModel().getName(), index: i});
      })
      this.trackContainer.appendChild(div)
    }
  }
  onTrackModelUpdate (data) {
    if (data.name !== this.controller.getModel().getName()) {
      return
    }
    const div = this.trackContainer.getElementsByTagName('div')[data.index]
    const track = this.controller.getModel().getTrack()[data.index]
    div.classList.remove('note_off')
    div.classList.remove('note_on')
    div.classList.add(`note_o${track ? 'n' : 'ff'}`)
  }
  destroy() {
    this.removeEventListeners()
    this.controller.destroy()
    this.trackContainer.innerHTML = ''
    this.trackContainer = null
    this.nameContainer = null
    this.container = null
    this.controller = null
  }
}
class DrumTrackListView {
  constructor (list) {
    this.container = document.querySelector('.drumtrack')
    this.controller = new DrumTrackListController()
    for (let i = 0; i < list.length; ++i) {
      const view = new DrumTrackView(list[i], asafonov.colors[i % asafonov.colors.length], this.container)
      this.controller.addTrackController(view.getController())
    }
  }
  destroy() {
    this.controller.destroy()
    this.controller = null
    this.container = null
  }
}
class InstrumentNoteTrackView {
  constructor (name, note, track, color, parentContainer) {
    this.name = name
    this.note = note
    this.track = track
    this.container = document.createElement('div')
    this.container.classList.add('row')
    this.container.classList.add('notes_row')
    parentContainer.appendChild(this.container)
    this.initNote()
    this.initTrack(color)
    this.addEventListeners()
  }
  addEventListeners() {
    asafonov.messageBus.subscribe(asafonov.events.TRACK_MODEL_UPDATED, this, 'onTrackModelUpdate')
  }
  removeEventListeners() {
    asafonov.messageBus.unsubscribe(asafonov.events.TRACK_MODEL_UPDATED, this, 'onTrackModelUpdate')
  }
  getController() {
    return this.controller
  }
  initNote() {
    this.nameContainer = document.createElement('div')
    this.nameContainer.classList.add('col')
    this.nameContainer.classList.add('names_col')
    this.nameContainer.classList.add('name')
    this.nameContainer.innerHTML = this.note.replace('_', '#')
    this.container.appendChild(this.nameContainer)
  }
  initTrack (color) {
    this.trackContainer = document.createElement('div')
    this.trackContainer.classList.add('col')
    this.trackContainer.classList.add('notes_col')
    this.trackContainer.classList.add(`${color}_color`)
    this.container.appendChild(this.trackContainer)
    for (let i = 0; i < this.track.length; ++i) {
      const div = document.createElement('div')
      div.className = 'note'
      div.classList.add(`note_o${this.track[i] ? 'n' : 'ff'}`)
      div.addEventListener('click', () => {
        asafonov.messageBus.send(asafonov.events.TRACK_VIEW_UPDATED, {name: this.name, note: this.note, index: i});
      })
      this.trackContainer.appendChild(div)
    }
  }
  onTrackModelUpdate (data) {
    if (data.name !== this.name || data.note !== this.note) {
      return
    }
    const div = this.trackContainer.getElementsByTagName('div')[data.index]
    div.classList.remove('note_off')
    div.classList.remove('note_on')
    div.classList.add(`note_o${this.track[data.index] ? 'n' : 'ff'}`)
  }
  destroy() {
    this.removeEventListeners()
    this.trackContainer.innerHTML = ''
    this.trackContainer = null
    this.nameContainer = null
    this.container = null
    this.name = null
    this.note = null
    this.track = null
  }
}
class InstrumentTrackView {
  constructor (name) {
    this.container = document.querySelector('.instrument')
    this.controller = new InstrumentTrackController(name)
    this.views = []
    const list = this.controller.getModel().getTrack()
    let i = 0
    for (let k in list) {
      this.views.push(new InstrumentNoteTrackView(name, k, list[k], asafonov.colors[i % asafonov.colors.length], this.container))
      ++i
    }
  }
  destroy() {
    for (let i = 0; i < this.views.length; ++i)
      this.views[i].destroy()
    this.views = null
    this.controller.destroy()
    this.controller = null
    this.container = null
  }
}
class UpdaterView {
  constructor (upstreamVersionUrl, updateUrl) {
    this.model = new Updater(upstreamVersionUrl)
    this.updateUrl = updateUrl
  }
  showUpdateDialogIfNeeded() {
    this.model.isUpdateNeeded()
      .then(isUpdateNeeded => {
        if (isUpdateNeeded) this.showUpdateDialog()
      })
  }
  showUpdateDialog() {
    if (confirm('New version available. Do you want to update the App?')) location.href = this.model.getUpdateUrl(this.updateUrl)
  }
}
window.asafonov = {}
window.asafonov.version = '0.1'
window.asafonov.messageBus = new MessageBus()
window.asafonov.events = {
  TRACK_MODEL_UPDATED: 'TRACK_MODEL_UPDATED',
  TRACK_VIEW_UPDATED: 'TRACK_VIEW_UPDATED',
  IS_PLAYING_UPDATED: 'IS_PLAYING_UPDATED'
}
window.asafonov.notes = notes
window.asafonov.waveUtils = waveUtils
window.asafonov.colors = ['red', 'green', 'yellow', 'green2', 'blue', 'blue2', 'violet']
window.asafonov.settings = {
  tempo: 100
}
window.onerror = (msg, url, line) => {
  alert(`${msg} on line ${line}`)
}
document.addEventListener("DOMContentLoaded", function (event) {
  const updaterView = new UpdaterView('https://raw.githubusercontent.com/asafonov/sunrise/master/VERSION.txt', 'https://github.com/asafonov/sunrise.apk/releases/download/{VERSION}/app-release.apk')
  updaterView.showUpdateDialogIfNeeded()
  const drums = ['kick', 'hihat', 'snare', 'low_tom', 'medium_tom', 'high_tom', 'crash']
  const drumView = new DrumTrackListView(drums)
  const controls = ['play', 'stop']
  const controlView = new ControlListView(controls)
  const rockyGuitar = new InstrumentTrackView('rocky_guitar')
})
