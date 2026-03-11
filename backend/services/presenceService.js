const onlineUsers = new Set();

export const setUserOnline = (userId) => {
  if (userId) {
    onlineUsers.add(userId);
  }
};

export const setUserOffline = (userId) => {
  if (userId) {
    onlineUsers.delete(userId);
  }
};

export const isUserOnline = (userId) => onlineUsers.has(userId);

export const getOnlineUsers = () => Array.from(onlineUsers);
