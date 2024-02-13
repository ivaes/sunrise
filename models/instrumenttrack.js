class InstrumentTrack {

  constructor (name, length) {
    this.name = name
    this.data = []
    this.length = length || 16
    this.initTrack(this.length)
    const file = `./audio/${name}/c4.wav`
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

    for (let k in window.asafonov.notes) {
      this.track[k] = []    

      for (let i = 0; i < length; ++i) {
        this.track.push(false)
      }
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