import React, { createContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [rescuerUserId, setRescuerUserId] = useState('');

  return (
    <AppContext.Provider value={{ rescuerUserId, setRescuerUserId }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
