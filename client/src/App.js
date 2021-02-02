import React, { Component } from "react";
import getWeb3, { getGanacheWeb3, Web3 } from "./utils/getWeb3";
import Header from "./components/Header/index.js";
import Footer from "./components/Footer/index.js";
import Publish from "./components/Publish/index.js";
import PhotoMarketplace from "./components/PhotoMarketplace/index.js";
import ipfs from './components/ipfs/ipfsApi.js'

import { Loader, Button, Card, Input, Heading, Table, Form, Flex, Box, Image } from 'rimble-ui';
import { zeppelinSolidityHotLoaderOptions } from '../config/webpack';

import styles from './App.module.scss';
//import './App.css';


class App extends Component {
  constructor(props) {    
    super(props);

    this.state = {
      /////// Default state
      storageValue: 0,
      web3: null,
      accounts: null,
      route: window.location.pathname.replace("/", ""),

      /////// Ipfs Upload
      buffer: null,
      ipfsHash: '',

      /////// NFT
      photo_marketplace: null, // Instance of contract
      totalSupply: 0,
      photoslist: [],         // Array for NFT

      photoData: [],
      photoDataAll: []
    };

    this.getTestData = this.getTestData.bind(this);
    this.addReputation = this.addReputation.bind(this);

    /////// Ipfs Upload
    this.captureFile = this.captureFile.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }


  ///////--------------------- Functions of reputation ---------------------------
  addReputation = async () => {
    const { accounts, photo_marketplace } = this.state;

    let _from2 = "0x2cb2418B11B66E331fFaC7FFB0463d91ef8FE8F5"
    let _to2 = accounts[0]
    let _tokenId2 = 1
    const response_1 = await photo_marketplace.methods.reputation(_from2, _to2, _tokenId2).send({ from: accounts[0] })
    console.log('=== response of reputation function ===', response_1);      // Debug

    const response_2 = await photo_marketplace.methods.getReputationCount(_tokenId2).call()
    console.log('=== response of getReputationCount function ===', response_2);      // Debug
  }


  ///////--------------------- Functions of testFunc ---------------------------  
  getTestData = async () => {

    const { accounts, photo_marketplace, web3 } = this.state;
    console.log('=== accounts[0] ===', accounts[0]);      // Debug


    let _from = accounts[0]
    let _to = "0x2cb2418B11B66E331fFaC7FFB0463d91ef8FE8F5"
    let _tokenId = 1
    const response_buy = await photo_marketplace.methods.buy(_from, _to, _tokenId).send({ from: accounts[0] })
    console.log('=== response of buy function ===', response_buy);      // Debug


    const response_1 = await photo_marketplace.methods.testFunc().send({ from: accounts[0] })
    console.log('=== response of testFunc function ===', response_1);      // Debug   
  }


  ///////--------------------- Functions of ipfsUpload ---------------------------  
  captureFile(event) {
    event.preventDefault()
    const file = event.target.files[0]
    
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)  // Read bufffered file

    // Callback
    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('=== buffer ===', this.state.buffer)
    }
  }
  
  onSubmit(event) {
    const { accounts, photo_marketplace, web3 } = this.state;

    event.preventDefault()

    ipfs.files.add(this.state.buffer, (error, result) => {
      // In case of fail to upload to IPFS
      if (error) {
        console.error(error)
        return
      }

      // In case of successful to upload to IPFS
      this.setState({ ipfsHash: result[0].hash })
      console.log('=== ipfsHash ===', this.state.ipfsHash)

      const color = this.state.ipfsHash

      // Append to array of NFT
      this.state.photo_marketplace.methods.mint(color).send({ from: accounts[0] })
      .once('receipt', (recipt) => {
        this.setState({
          photoslist: [...this.state.photoslist, color]
        })

        console.log('=== recipt ===', recipt);
        console.log('=== recipt.events.Transfer.returnValues.tokenId ===', recipt.events.Transfer.returnValues.tokenId);
        console.log('=== recipt.events.Transfer.returnValues.to ===', recipt.events.Transfer.returnValues.to);

        let tokenId = recipt.events.Transfer.returnValues.tokenId
        let ownerAddr = recipt.events.Transfer.returnValues.to
        let reputationCount = 0
        this.setState({ photoData: [tokenId, ownerAddr, reputationCount] })
        this.setState({ photoDataAll: [...this.state.photoDataAll, this.state.photoData] })
      })
      console.log('=== photoslist ===', this.state.photoslist)
      console.log('=== photoData ===', this.state.photoData)      
      console.log('=== photoDataAll ===', this.state.photoDataAll)
    })
  }  



 
  //////////////////////////////////// 
  ///// Ganache
  ////////////////////////////////////
  getGanacheAddresses = async () => {
    if (!this.ganacheProvider) {
      this.ganacheProvider = getGanacheWeb3();
    }
    if (this.ganacheProvider) {
      return await this.ganacheProvider.eth.getAccounts();
    }
    return [];
  }

  componentDidMount = async () => {
    console.log('=== photoData（＠componentDidMount）===', this.state.photoData)      
    console.log('=== photoDataAll（＠componentDidMount）===', this.state.photoDataAll)

    const hotLoaderDisabled = zeppelinSolidityHotLoaderOptions.disabled;
 
    let PhotoMarketPlace = {};
    try {
      PhotoMarketPlace = require("../../build/contracts/PhotoMarketPlace.json"); // Load ABI of contract of PhotoMarketPlace
    } catch (e) {
      console.log(e);
    }

    try {
      const isProd = process.env.NODE_ENV === 'production';
      if (!isProd) {
        // Get network provider and web3 instance.
        const web3 = await getWeb3();
        let ganacheAccounts = [];

        try {
          ganacheAccounts = await this.getGanacheAddresses();
        } catch (e) {
          console.log('Ganache is not running');
        }

        // Use web3 to get the user's accounts.
        const accounts = await web3.eth.getAccounts();
        // Get the contract instance.
        const networkId = await web3.eth.net.getId();
        const networkType = await web3.eth.net.getNetworkType();
        const isMetaMask = web3.currentProvider.isMetaMask;
        let balance = accounts.length > 0 ? await web3.eth.getBalance(accounts[0]): web3.utils.toWei('0');
        balance = web3.utils.fromWei(balance, 'ether');

        let instancePhotoMarketPlace = null;
        let deployedNetwork = null;

        // Create instance of contracts
        if (PhotoMarketPlace.networks) {
          deployedNetwork = PhotoMarketPlace.networks[networkId.toString()];
          if (deployedNetwork) {
            instancePhotoMarketPlace = new web3.eth.Contract(
              PhotoMarketPlace.abi,
              deployedNetwork && deployedNetwork.address,
            );
            console.log('=== instancePhotoMarketPlace ===', instancePhotoMarketPlace);
          }
        }

        if (instancePhotoMarketPlace) {
          // Set web3, accounts, and contract to the state, and then proceed with an
          // example of interacting with the contract's methods.
          this.setState({ web3, ganacheAccounts, accounts, balance, networkId, networkType, hotLoaderDisabled,
            isMetaMask, photo_marketplace: instancePhotoMarketPlace }, () => {
              this.refreshValues(instancePhotoMarketPlace);
              setInterval(() => {
                this.refreshValues(instancePhotoMarketPlace);
              }, 5000);
            });
        }
        else {
          this.setState({ web3, ganacheAccounts, accounts, balance, networkId, networkType, hotLoaderDisabled, isMetaMask });
        }


        //---------------- NFT（Always load listed NFT data）------------------
        const { photo_marketplace } = this.state;

        const totalSupply = await photo_marketplace.methods.totalSupply().call()
        this.setState({ totalSupply: totalSupply })

        // Load photoslist
        for (var i=1; i<=totalSupply; i++) {
          const color = await photo_marketplace.methods.photoslist(i - 1).call()
          this.setState({
            photoslist: [...this.state.photoslist, color]
          })
        }
        console.log('======== photoslist ========', this.state.photoslist)

      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  refreshValues = (instancePhotoMarketPlace) => {
    if (instancePhotoMarketPlace) {
      console.log('refreshValues of instancePhotoMarketPlace');
    }
  }

  renderLoader() {
    return (
      <div className={styles.loader}>
        <Loader size="80px" color="red" />
        <h3> Loading Web3, accounts, and contract...</h3>
        <p> Unlock your metamask </p>
      </div>
    );
  }

  renderDeployCheck(instructionsKey) {
    return (
      <div className={styles.setup}>
        <div className={styles.notice}>
          Your <b> contracts are not deployed</b> in this network. Two potential reasons: <br />
          <p>
            Maybe you are in the wrong network? Point Metamask to localhost.<br />
            You contract is not deployed. Follow the instructions below.
          </p>
        </div>
      </div>
    );
  }

  renderPublish() {
    return (
      <div className={styles.wrapper}>
        <Publish />
      </div>
    );
  }

  renderPhotoMarketPlace() {
    return (
      <div className={styles.wrapper}>
        <PhotoMarketplace />
      </div>    
    );
  }

  render() {
    return (
      <div className={styles.App}>
        <Header />
          {this.state.route === 'publish' && this.renderPublish()}
          {this.state.route === 'photo_marketplace' && this.renderPhotoMarketPlace()}
        <Footer />
      </div>
    );
  }
}

export default App;
