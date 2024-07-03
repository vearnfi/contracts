const ethers = require('@vechain/ethers')

try {
  if (process.env.WALLET_MNEMONIC == null) {
    throw new Error('Call with WALLET_MNEMONIC="<mnemonic words>" node mnemonic-to-pk.js')
  }
  const accountNumber = 1
  const wallet = ethers.Wallet.fromMnemonic(process.env.WALLET_MNEMONIC, `m/44'/818'/0'/0/${accountNumber}`)
  console.log(wallet)
} catch (err) {
  console.error(err.message)
}
