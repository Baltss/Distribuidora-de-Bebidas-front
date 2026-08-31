export const getUserId = () => {
  return sessionStorage.getItem('userId') || null;
};
