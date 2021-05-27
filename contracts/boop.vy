# @version 0.2.12
from vyper.interfaces import ERC20

implements: ERC20

event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256


event Approval:
    owner: indexed(address)
    spender: indexed(address)
    value: uint256


allowance: public(HashMap[address, HashMap[address, uint256]])
balanceOf: public(HashMap[address, uint256])
totalSupply: public(uint256)
boopedAmount: public(HashMap[address, uint256])
totalBooped: public(uint256)
inPoolSince: public(HashMap[address, uint256])
outstandingRewards: public(HashMap[address, uint256])
totalRevenue: public(uint256)
totalReserves: public(uint256)
feeBPS: public(uint256)
owner: public(address)
swapper: public(address)
paymentsReceived: public(uint256)
nonces: public(HashMap[address, uint256])
DOMAIN_SEPARATOR: public(bytes32)
BASE_TOKEN: public(address)
DOMAIN_TYPE_HASH: constant(bytes32) = keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
PERMIT_TYPE_HASH: constant(bytes32) = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")

firstUnstake: bool

@external
def __init__(base_token:address, fee_bps:uint256):
    self.BASE_TOKEN = base_token
    self.feeBPS = fee_bps
    self.firstUnstake = True
    self.owner = msg.sender
    self.DOMAIN_SEPARATOR = keccak256(
        concat(
            DOMAIN_TYPE_HASH,
            keccak256(convert("Boop", Bytes[5])),
            keccak256(convert("1", Bytes[1])),
            convert(chain.id, bytes32),
            convert(self, bytes32)
        )
    )


@view
@external
def name() -> String[5]:
    return "Boop"


@view
@external
def symbol() -> String[5]:
    return "BOOP"


@view
@external
def decimals() -> uint256:
    return 12


@internal
def _mint(receiver: address, amount: uint256):
    assert not receiver in [self, ZERO_ADDRESS], "Invalid destination"

    self.balanceOf[receiver] += amount
    self.boopedAmount[receiver] += amount
    self.totalSupply += amount
    self.totalBooped += amount

    log Transfer(ZERO_ADDRESS, receiver, amount)


@internal
def _burn(sender: address, amount: uint256):
    self.balanceOf[sender] -= amount
    self.boopedAmount[sender] -= amount
    self.totalSupply -= amount
    self.totalBooped -= amount

    log Transfer(sender, ZERO_ADDRESS, amount)


@view
@internal
def _getUnaccountedRewards(sender: address) -> uint256:
    rewards_to_pay: uint256 = 0
    if self.totalRevenue > self.inPoolSince[sender]:
        rewards_to_pay  = (self.totalRevenue - self.inPoolSince[sender]) \
                                * self.boopedAmount[sender] / self.totalBooped
    return rewards_to_pay


@view
@external
def getRewardsEstimate(sender: address) -> uint256:
    return self._getUnaccountedRewards(sender) + self.outstandingRewards[sender]


@internal
def _newEntrantFilter(sender: address):
    if self.firstUnstake:
        self.firstUnstake = False
    elif self.inPoolSince[sender] == 0:
        # Has no prior staking history we should initialize it
        self.inPoolSince[sender] = self.totalRevenue


@internal
def _updateStake(sender: address):
    self._newEntrantFilter(sender)
    self.outstandingRewards[sender] += self._getUnaccountedRewards(sender)
    self.inPoolSince[sender] = self.totalRevenue


@internal
def _resetRewards(sender: address):
    self.outstandingRewards[sender] = 0


@internal
def _reduceStake(sender: address):
    # Reduce stake if wallet doesn't have all minted coins. This is to ensure no idex
    # gets locked over time and fees are paid only to holders who actively created supply
    stake_diff: uint256 = max(self.boopedAmount[sender] - self.balanceOf[sender], 0)
    if stake_diff > 0:
        self._updateStake(sender)
        self.totalBooped -= stake_diff
        self.boopedAmount[sender] = self.balanceOf[sender]

@internal
def _addToRewards(sender: address, amount: uint256) -> bool:
    assert ERC20(self.BASE_TOKEN).transfer(self, amount), "Failure in ERC20 transfer"
    self.totalRevenue += amount
    return True


@internal
def _transfer(sender: address, receiver: address, amount: uint256):
    assert not receiver in [self, ZERO_ADDRESS], "Invalid destination"

    self.balanceOf[sender] -= amount
    self.balanceOf[receiver] += amount
    self._reduceStake(sender)

    log Transfer(sender, receiver, amount)


@external
def transfer(receiver: address, amount: uint256) -> bool:
    self._transfer(msg.sender, receiver, amount)
    return True


@external
def transferFrom(sender: address, receiver: address, amount: uint256) -> bool:
    self.allowance[sender][msg.sender] -= amount
    self._transfer(sender, receiver, amount)
    return True


@external
def approve(spender: address, amount: uint256) -> bool:
    self.allowance[msg.sender][spender] = amount
    log Approval(msg.sender, spender, amount)
    return True


@internal
def _boop(sender: address, amount: uint256) -> bool:
    self._updateStake(sender)
    mint_amount: uint256 = min(amount, ERC20(self.BASE_TOKEN).balanceOf(sender))
    assert ERC20(self.BASE_TOKEN).transferFrom(sender, self, mint_amount), "Failure in ERC20 transfer"
    self._mint(sender, mint_amount)
    self.totalReserves += mint_amount
    return True

@view
@internal
def _estimateFee(amount: uint256) -> uint256:
    return amount * self.feeBPS / 1000


@internal
def _takeFeesFromAmount(amount: uint256) -> uint256:
    fee_amount: uint256 = self._estimateFee(amount)
    self.totalRevenue += fee_amount
    return amount - fee_amount


@internal
def _returnBaseToken(receiver: address, amount: uint256) -> bool:
    self.totalReserves -= amount
    assert ERC20(self.BASE_TOKEN).transfer(receiver, amount), "Failure in ERC20 transfer"
    return True


@internal
def _claim(sender: address) -> bool:
    self._updateStake(sender)
    rewards_to_pay: uint256 = self.outstandingRewards[sender]
    if rewards_to_pay > 0:
        self._resetRewards(sender)
        final_amount: uint256 = self._takeFeesFromAmount(rewards_to_pay)
        self._returnBaseToken(sender, final_amount)
    return True


@internal
def _unboop(sender: address, amount: uint256) -> bool:
    burn_amount: uint256 = min(amount, self.balanceOf[sender])
    final_amount: uint256 = self._takeFeesFromAmount(burn_amount)

    self._claim(sender)
    self._burn(sender, burn_amount)
    self._returnBaseToken(sender, final_amount)
    return True


@external
def boop(amount: uint256) -> bool:
    self._boop( msg.sender, amount)
    return True


@external
def unboop(amount: uint256) -> bool:
    self._unboop(msg.sender, amount)
    return True


@external
def claim() -> bool:
    self._claim(msg.sender)
    return True


@external
def addToRewards(amount: uint256) -> bool:
    return self._addToRewards(msg.sender, amount)


@external
def setSwapperContract(swapper: address) -> bool:
    assert swapper not in [ZERO_ADDRESS, self], "Invalid destination"
    assert msg.sender == self.owner, "Unauthorized"
    self.swapper = swapper
    return True


@external
def destroyOwner() -> bool:
    assert msg.sender == self.owner, "Unauthorized"
    self.owner = ZERO_ADDRESS
    return True


@external
@payable
def __default__():
    # Accrue staking rewards from idex replicator/validator
    self.paymentsReceived += msg.value


@internal
def _sendEthPayableToSwapper():
    send(self.swapper, self.paymentsReceived)
    self.paymentsReceived = 0


@internal
def _sendERC20PayableToSwapper(token: address) -> bool:
    amount: uint256 = ERC20(token).balanceOf(self)
    if amount == 0:
        return True
    if token == self.BASE_TOKEN:
        amount = amount - self.totalReserves
    approved: uint256 = ERC20(token).allowance(self, self)
    if amount > approved:
        assert ERC20(token).approve(self, MAX_UINT256), "Failure in ERC20 approve"
    assert ERC20(token).transfer(self.swapper, amount), "Failure in ERC20 transfer"
    return True

@external
def routePaymentsToSwapper(token: address) -> bool:
    assert self.swapper not in [ZERO_ADDRESS, self], "Invalid destination"
    assert self.paymentsReceived != 0, "No payments accrued"
    assert token != self, "Invalid option"
    # Swapper will swap ETH or any ERC20 to IDEX and call addToRewards
    # to be distributed to stakers
    if token == ZERO_ADDRESS:
        self._sendEthPayableToSwapper()
    elif token.is_contract:
        assert self._sendERC20PayableToSwapper(token)
    return True


@external
def permit(owner: address, spender: address, amount: uint256, expiry: uint256, signature: Bytes[65]) -> bool:
    assert owner != ZERO_ADDRESS  # dev: invalid owner
    assert expiry == 0 or expiry >= block.timestamp  # dev: permit expired
    nonce: uint256 = self.nonces[owner]
    digest: bytes32 = keccak256(
        concat(
            b'\x19\x01',
            self.DOMAIN_SEPARATOR,
            keccak256(
                concat(
                    PERMIT_TYPE_HASH,
                    convert(owner, bytes32),
                    convert(spender, bytes32),
                    convert(amount, bytes32),
                    convert(nonce, bytes32),
                    convert(expiry, bytes32),
                )
            )
        )
    )
    # NOTE: signature is packed as r, s, v
    r: uint256 = convert(slice(signature, 0, 32), uint256)
    s: uint256 = convert(slice(signature, 32, 32), uint256)
    v: uint256 = convert(slice(signature, 64, 1), uint256)
    assert ecrecover(digest, v, r, s) == owner  # dev: invalid signature
    self.allowance[owner][spender] = amount
    self.nonces[owner] = nonce + 1
    log Approval(owner, spender, amount)
    return True
