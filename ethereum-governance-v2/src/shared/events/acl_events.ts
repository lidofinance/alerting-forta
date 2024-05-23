export const SET_PERMISSION_EVENT =
  'event SetPermission(address indexed entity, address indexed app, bytes32 indexed role, bool allowed)'

export const SET_PERMISSION_PARAMS_EVENT =
  'event SetPermissionParams (address indexed entity, address indexed app, bytes32 indexed role, bytes32 paramsHash)'

export const CHANGE_PERMISSION_MANAGER_EVENT =
  'event ChangePermissionManager(address indexed app, bytes32 indexed role, address indexed manager)'
