const RE_VALIDATE_HASH = /^[0-9a-f]{32}$/

class Utxo {
  constructor (hash, output, value) {
    this.hash = hash
    this.output = output
    this.value = value
  }

  isSyntacticallyValid () {
    if (typeof(this.hash) !== 'string' || this.hash.match(RE_VALIDATE_HASH)) {
      return false
    }

    if (typeof(this.output) !== 'number' || this.output < 0) {
      return false
    }

    if (typeof(this.value) !== 'number' || this.value < 0) {
      return false
    }

    return true
  }
}

module.exports = { Utxo }