const gr = require('graphql-request')
const { gql } = gr;
/**
 * Declare bodies for entities e.g. Action, Option, Pool, User, Manager
 */

export const OptionFragment = gql`
  fragment OptionFragment on Option {
    id
    address
    from
    type
    exerciseType
    underlyingAsset
    underlyingAssetDecimals
    underlyingAssetSymbol
    strikeAsset
    strikeAssetDecimals
    strikeAssetSymbol
    collateralAsset
    collateralAssetDecimals
    collateralAssetSymbol
    strikePrice
    expiration
    exerciseWindowSize
    exerciseStart
    seriesFeeVolume
    factory {
      id
    }
  }
`;

export const PoolFragment = gql`
  fragment PoolFragment on Pool {
    id
    address
    tokenA
    tokenADecimals
    tokenASymbol
    tokenB
    tokenBDecimals
    tokenBSymbol
    factory {
      id
    }
    option {
      id
    }
  }
`;

export const ActionFragmentLight = gql`
  fragment ActionFragmentLight on Action {
    id
    hash
    type
    from
    timestamp
    inputTokenA
    inputTokenB
    outputTokenA
    outputTokenB
    user {
      id
    }
    option {
      id
      pool {
        id
      }
    }
    optionType
  }
`;

export const ActionFragmentHeavy = gql`
  fragment ActionFragmentHeavy on Action {
    ...ActionFragmentLight
    spotPrice {
      value
    }
    metadata {
      optionsMintedAndSold
    }
    nextIV
    nextSellingPrice
    nextBuyingPrice
    nextDynamicSellingPrice
    nextDynamicBuyingPrice
    nextUserTokenALiquidity
    nextUserTokenBLiquidity
    nextTBA
    nextTBB
    nextDBA
    nextDBB
    nextFeesA
    nextFeesB
    nextCollateralTVL
    nextPoolTokenATVL
    nextPoolTokenBTVL
    nextUserSnapshotFIMP
    nextUserTokenAOriginalBalance
    nextUserTokenBOriginalBalance
  }
  ${ActionFragmentLight}
`;

export const UserFragment = gql`
  fragment UserFragment on User {
    id
  }
`;

export const ConfigurationFragment = gql`
  fragment ConfigurationFragment on Configuration {
    id
    owner
    timestamp
    optionFactory {
      id
    }
    optionHelper {
      id
    }
    poolFactory {
      id
    }
    manager {
      id
    }
  }
`;

export const ManagerFragment = gql`
  fragment ManagerFragment on Manager {
    id
    configuration {
      ...ConfigurationFragment
    }
  }
  ${ConfigurationFragment}
`;

export const OptionFactoryFragment = gql`
  fragment OptionFactoryFragment on OptionFactory {
    id
  }
`;

export const PoolFactoryFragment = gql`
  fragment PoolFactoryFragment on PoolFactory {
    id
  }
`;

export const OptionHelperFragment = gql`
  fragment OptionHelperFragment on OptionHelper {
    id
  }
`;

export const OptionHourActivity = gql`
  fragment OptionFactoryFragmentHour on OptionFactory {
    id
    option {
      id
    }
    timestamp
    day
    hour
    hourlyPremiumReceived
    hourlyPremiumPaid
    hourlyGrossVolumeOptions
    hourlyGrossVolumeTokens
    hourlyActionsCount
  }
`;

export const OptionDayActivity = gql`
  fragment OptionFactoryFragmentDay on OptionFactory {
    id
    option {
      id
    }
    timestamp
    day
    dailyPremiumReceived
    dailyPremiumPaid
    dailyGrossVolumeOptions
    dailyGrossVolumeTokens
    dailyActionsCount
  }
`;

export const PositionFragment = gql`
  fragment PositionFragment on Position {
    id
    expiration
    optionType
    premiumPaid
    premiumReceived
    optionsBought
    optionsSold
    optionsResold
    optionsMinted
    optionsUnminted
    optionsExercised
    underlyingWithdrawn
    strikeWithdrawn
    initialOptionsProvided
    initialTokensProvided
    remainingOptionsProvided
    remainingTokensProvided
    finalOptionsRemoved
    finalTokensRemoved
    optionsSent
    optionsReceived
  }
`;

export const PositionWithDependenciesFragment = gql`
  fragment PositionWithDependenciesFragment on Position {
    ...PositionFragment
    user {
      ...UserFragment
    }
    option {
      ...OptionFragment
      pool {
        ...PoolFragment
      }
    }
  }
  ${PositionFragment}
  ${UserFragment}
  ${OptionFragment}
  ${PoolFragment}
`;