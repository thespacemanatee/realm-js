////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState } from "react";
import Realm from "realm";

type ProviderProps = Realm.Configuration;

export type RealmProviderType = React.FC<ProviderProps>;

export function createRealmProvider(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): RealmProviderType {
  const RealmProvider: React.FC<ProviderProps> = ({ children, ...restProps }) => {
    const [realm, setRealm] = useState<Realm | null>(null);
    //XXX consider configuration being changed with state (write tests for this)
    //XXX consider rendering the provider twice and unmounting one of them (does the other still work?)
    useEffect(() => {
      let shouldInitRealm = realm === null;

      // if restProps change, then close the realm before reopening it
      if (realm && !realm.isClosed) {
        realm.close();

        setRealm(null);

        // We need to keep track of `shouldInitRealm` separately from the `realm` state because even
        // though we `setRealm(null)` above, the async nature of setting state means the value of `realm`
        // does not change to `null` until this function has finished executing, so we can't just check
        // `if (realm === null)` at the end of the function
        shouldInitRealm = true;
      }

      const initRealm = async () => {
        const combinedConfig = mergeConfiguration(realmConfig, restProps);
        const openRealm = await Realm.open(combinedConfig);

        setRealm(openRealm);
      };

      if (shouldInitRealm) {
        initRealm().catch(console.error);
      }

      // We need to spread the values of `restProps` into the dependency array rather than just passing
      // in `restProps` directly, because `restProps` is an object who's identity changes every render
      // so you end up in a re-render loop
    }, [...Object.values(restProps)]);

    useEffect(() => {
      return () => {
        if (realm) {
          realm.close();
          setRealm(null);
        }
      };
    }, [realm, setRealm]);

    if (realm == null) {
      return null;
    }

    return <RealmContext.Provider value={realm} children={children} />;
  };

  return RealmProvider;
}

export function mergeConfiguration(
  configA: Realm.Configuration,
  configB: Partial<Realm.Configuration>,
): Realm.Configuration {
  const sync = { ...configA.sync, ...configB.sync };

  return {
    ...configA,
    ...configB,
    ...(Object.keys(sync).length > 0 ? { sync } : undefined),
  } as Realm.Configuration;
}
