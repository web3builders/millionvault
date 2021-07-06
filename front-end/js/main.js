var web3, accounts, user, Million, Vault

var User = {
    "mm_balance" : "",
    "mv_balance" : "",
    "dividends"  : "",
    "allowed"    : false
}

var Dapp = {
    "total_mm" : "",
    "total_mv" : "",
    "buyPrice" : "",
    "sellPrice": ""
}

var url = "https://www.millionvault.org/#/"
var defaultRef = "0x433cbfCB142e579cD6D86E207E7BE8D51eBE812c"
var vaultAddress = "0x53684d5bcB3eEB589ff88eD6054B3301F55FbCde"

$(document).ready(function() {
    init()
    
    $("#actions").on("click", "#enable", function() {
        enable()
    })
    
    $("#stake").click(function() {
        let amt = parseFloat($("#buy").val())
        if(amt > 0) {
            if(parseFloat(web3.utils.fromWei(User.mm_balance)) >= amt) {
                buy(amt, localStorage.getItem("referrer"))
            } else {
                $("#stakeinfo").text("Not enough $MM in wallet")
                $("#buy").val("")
            }
        } else {
            $("#stakeinfo").text("Invalid amount...")
            $("#buy").val("")
        }
    })
    
    $("#unstake").click(function() {
        let amt = parseFloat($("#sell").val())
        if(amt > 0) {
            if(parseFloat(web3.utils.fromWei(User.mv_balance)) >= amt) {
                sell(amt)
            } else {
                $("#stakeinfo").text("Not enough $MV in your account")
                $("#buy").val("")
            }
        } else {
            $("#stakeinfo").text("Invalid amount...")
            $("#sell").val("")
        }
    })
    
    $("#reinvest").click(function() {
        if(parseFloat(web3.utils.fromWei(User.dividends)) > 0) {
            reinvest()
        } else {
            $("#stakeinfo").text("No dividends to reinvest")
        }
    })
    
    $("#withdraw").click(function() {
        if(parseFloat(web3.utils.fromWei(User.dividends)) > 0) {
            withdraw()
        } else {
            $("#stakeinfo").text("No dividends to withdraw")
        }
    })
})

async function init() {
    try {
        if(window.ethereum) {
            $("#message").text('Please connect your wallet')
        } else {
            $("#message").text('Your browser does not support web3 content. Consider using MetaMask.')
            return;
        }
        await ethereum.request({method: 'eth_requestAccounts'})
        window.ethereum.on("accountsChanged", (accounts) => {setup()})
        window.ethereum.on('networkChanged', function() {setup()})
        await setup()
    }
    catch(e) {
        console.error(e)
    }
}

async function setup() {
    try {
        web3 = new Web3(window.ethereum)
        setReferrer()
        accounts = await web3.eth.getAccounts()
        user = accounts[0]
        let chainID = await web3.eth.getChainId()
        /*if(chainID !== 1) {
            $("#message").text('Please connect to Ethereum mainNet')
            return;
        }*/
        
        Million = new web3.eth.Contract(MM, "0x6B4c7A5e3f0B99FCD83e9c089BDDD6c7FCe5c611")
        Vault = new web3.eth.Contract(MV, vaultAddress)

        $("#message").text('Welcome '+format(user)+'')
        $("#userAddress").text(format(user))
        $("#reflink").html('<a href="'+url+user+'" target="_blank">'+url+user+'</a>')

        await fetchData()

        $("#userInfo").css("display", "flex")
        $("#actions").css("display", "block")
    }
    catch(e) {
        console.error(e)
    }
}

async function fetchData() {
    try {
        await Million.methods.allowance(user, vaultAddress).call().then(function(r) {
            if(r > 0) {
                User.allowed = true
            }
        })
        
        await Vault.methods.multiData().call({from: user}).then(function(r) {
            if(r[0] !== Dapp.total_mm) {
                Dapp.total_mm = r[0]
            }
            if(r[1] !== Dapp.total_mv) {
                Dapp.total_mv = r[1]
            }
            if(r[2] !== User.mv_balance) {
                User.mv_balance = r[2]
                $("#mv_balance").text(toFixed(web3.utils.fromWei(User.mv_balance), 4))
            }
            if(r[3] !== User.mm_balance) {
                User.mm_balance = r[3]
                $("#mm_balance").text(toFixed(web3.utils.fromWei(User.mm_balance), 4))
            }
            if(r[4] !== User.dividends) {
                User.dividends = r[4]
                $("#dividends").text(toFixed(web3.utils.fromWei(User.dividends), 4))
            }
            if(r[5] !== Dapp.buyPrice) {
                Dapp.buyPrice = r[5]
            }
            if(r[6] !== Dapp.sellPrice) {
                Dapp.sellPrice = r[6]
            }
        })

        if(!User.allowed) {
            $("#stakeinfo").html('<div class="row input"><span>Enable $MM token to use this platform</span><button id="enable" class="btn">Enable</button></div>')
            $("#dapp").addClass("disabled")
        } else {
            // $("#stakeinfo").html('')
            $("#dapp").removeClass("disabled")
        }
        
        $("#weight").text(getWeight()+"%")
        
        setTimeout(fetchData, 2000)
        
    }
    catch(e) {
        console.error(e)
    }
}

async function enable() {
    try {
        await Million.methods.approve(vaultAddress, "115792089237316195423570985008687907853269984665640564039457584007913129639935").send({from: user})
        .on("transactionHash", function(hash) {
            $("#stakeinfo").html('<span>Pending approve [<a href="https://etherscan.io/tx/'+hash+'" target="_blank">view on Etherscan</a>]</span>')
        })
        .on("receipt", function(receipt) {
            $("#stakeinfo").html('<span>Approved! [<a href="https://etherscan.io/tx/'+receipt.transactionHash+'" target="_blank">view on Etherscan</a>]</span>')
        })
    }
    catch(e) {
        console.error(e)
    }
}

async function buy(amt, ref) {
    try {
        let weiamt = web3.utils.toWei(amt.toString())
        Vault.methods.buy(weiamt, ref).send({from: user})
        .on("transactionHash", function(hash) {
            $("#stakeinfo").html('<span>Pending stake [<a href="https://etherscan.io/tx/'+hash+'" target="_blank">view on Etherscan</a>]</span>')
        })
        .on("receipt", function(receipt) {
            $("#stakeinfo").html('<span>Stake completed! [<a href="https://etherscan.io/tx/'+receipt.transactionHash+'" target="_blank">view on Etherscan</a>]</span>')
            $("#buy").val("")
        })
    }
    catch(e) {
        console.error(e)
    }
}

async function sell(amt) {
    try {
        let weiamt = web3.utils.toWei(amt.toString())
        Vault.methods.sell(weiamt).send({from: user})
        .on("transactionHash", function(hash) {
            $("#stakeinfo").html('<span>Pending unstake [<a href="https://etherscan.io/tx/'+hash+'" target="_blank">view on Etherscan</a>]</span>')
        })
        .on("receipt", function(receipt) {
            $("#stakeinfo").html('<span>Unstake completed! [<a href="https://etherscan.io/tx/'+receipt.transactionHash+'" target="_blank">view on Etherscan</a>]</span>')
            $("#sell").val("")
        })
    }
    catch(e) {
        console.error(e)
    }
}

async function reinvest() {
    try {
        Vault.methods.reinvest().send({from: user})
        .on("transactionHash", function(hash) {
            $("#stakeinfo").html('<span>Pending reinvest [<a href="https://etherscan.io/tx/'+hash+'" target="_blank">view on Etherscan</a>]</span>')
        })
        .on("receipt", function(receipt) {
            $("#stakeinfo").html('<span>Reinvest completed! [<a href="https://etherscan.io/tx/'+receipt.transactionHash+'" target="_blank">view on Etherscan</a>]</span>')
        })
    }
    catch(e) {
        console.error(e)
    }
} 

async function withdraw() {
    try {
        Vault.methods.withdraw().send({from: user})
        .on("transactionHash", function(hash) {
            $("#stakeinfo").html('<span>Pending withdraw [<a href="https://etherscan.io/tx/'+hash+'" target="_blank">view on Etherscan</a>]</span>')
        })
        .on("receipt", function(receipt) {
            $("#stakeinfo").html('<span>Withdraw completed! [<a href="https://etherscan.io/tx/'+receipt.transactionHash+'" target="_blank">view on Etherscan</a>]</span>')
        })
    }
    catch(e) {
        console.error(e)
    }
} 

function setReferrer() {
    let path = window.location.href;
    let match = path.match(/\/#\/(.+)\??/);
    if (match) {
        let ref = decodeURIComponent(match[1]);
        if (web3.utils.isAddress(ref)) {
            window.localStorage.setItem("referrer", ref);
        }
    }
}

if(localStorage.getItem("referrer") === null) {
    window.localStorage.setItem("referrer", defaultRef);
}

function getWeight() {
    let total = parseFloat(web3.utils.fromWei(Dapp.total_mv))
    if(total == "0") {return 0}
    let user = parseFloat(web3.utils.fromWei(User.mv_balance))
    let result = toFixed((user * 100 / total), 2)
    return result;
}

function format(address) {
    let firstSix = address.substring(0, 6)
    let lastFour = address.substr(address.length - 4)
    return firstSix + "..." + lastFour
}

function toFixed(num, fixed) {
    var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?')
    return num.toString().match(re)[0]
}