type Dex = {
  routerV2: string;
  pairVVET_VTHO: string;
}

type NetworkConfig = {
  name: string;
  verocket: Dex;
  vexchange: Dex;
}

export const networkConfig: Record<100010 | 100009, NetworkConfig> = {
  100009: {
    name: "mainnet",
    verocket: {
      routerV2: "0x576da7124c7bb65a692d95848276367e5a844d95",
      pairVVET_VTHO: "0x29a996b0ebb7a77023d091c9f2ca34646bea6ede",
    },
    vexchange: {
      routerV2: "0x6c0a6e1d922e0e63901301573370b932ae20dadb",
      pairVVET_VTHO: "",
    }
  },
  100010: {
    name: "testnet",
    verocket:{
      routerV2: "0x91e42759290239a62ac757cf85bb5b74ace57927",
      pairVVET_VTHO: "0x1e5e9a6540b15a3efa8d4e8fadb82cc8e0e167ca",
    },
    vexchange: {
      routerV2: "0x01d6b50b31c18d7f81ede43935cadf79901b0ea0",
      pairVVET_VTHO: "",
    },
  },
}
