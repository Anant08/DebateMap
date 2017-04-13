import {applyMiddleware, compose, createStore, StoreEnhancer, Store} from "redux";
import thunk from "redux-thunk";
import {createBrowserHistory} from "react-router/node_modules/history";
import {reduxFirebase, getFirebase} from "react-redux-firebase";
import {version, firebaseConfig} from "../../BakedConfig";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {persistStore, autoRehydrate} from "redux-persist";
import {createFilter, createBlacklistFilter} from "redux-persist-transform-filter";
import {routerMiddleware} from 'react-router-redux'
import {MakeRootReducer, RootState} from "../../Store/index";
import watch from "redux-watch";
import {PreDispatchAction, MidDispatchAction, PostDispatchAction} from "./ActionProcessor";
import {GetUrlVars} from "../General/URLs";

export const browserHistory = createBrowserHistory();

export default function(initialState = {}, history) {
	// Window Vars Config
	// ==========
	g.version = version;

	// Middleware Configuration
	// ==========
	const middleware = [
		thunk.withExtraArgument(getFirebase),
		// for some reason, this breaks stuff if we have it the last one
		/*store=>next=>action=> {
			Log("What!" + action.type);
			PreDispatchAction(action);
			const returnValue = next(action);
			MidDispatchAction(action, returnValue);
			WaitXThenRun(0, ()=>PostDispatchAction(action));
			return returnValue;
		},*/
		routerMiddleware(browserHistory),
	];
	let lateMiddleware = [
		// for some reason, this breaks stuff if we have it the last one
		store=>next=>action=> {
			PreDispatchAction(action);
			const returnValue = next(action);
			MidDispatchAction(action, returnValue);
			WaitXThenRun(0, ()=>PostDispatchAction(action));
			return returnValue;
		},
	];

	// Store Enhancers
	// ==========
	const extraEnhancers = [];
	//if (devEnv) {
	const devToolsExtension = g.devToolsExtension;
	if (typeof devToolsExtension === "function") {
		//enhancers.push(devToolsExtension());
		extraEnhancers.push(devToolsExtension({maxAge: 100}));
	}
	//}

	// Store Instantiation and HMR Setup
	// ==========

	//reduxConfig["userProfile"] = DBPath("users"); // root that user profiles are written to
	let reduxFirebaseConfig = {
		userProfile: DBPath("users"), // root that user profiles are written to
		enableLogging: false, // enable/disable Firebase Database Logging
		updateProfileOnLogin: false // enable/disable updating of profile on login
		// profileDecorator: (userData) => ({ email: userData.email }) // customize format of user profile
	};

	const store = createStore(
		MakeRootReducer(),
		initialState,
		compose(
			applyMiddleware(...middleware),
			reduxFirebase(firebaseConfig, reduxFirebaseConfig),
			autoRehydrate(),
			applyMiddleware(...lateMiddleware), // place late-middleware after reduxFirebase, so it can intercept all its dispatched events
			...extraEnhancers
		) as StoreEnhancer<any>
	) as Store<RootState> & {asyncReducers};
	store.asyncReducers = {};

	/*let w = watch(()=>store.getState());
	store.subscribe(w((newVal, oldVal) => {
		ProcessAction(g.lastAction, newVal, oldVal);
	}));*/

	// begin periodically persisting the store
	//let persister = persistStore(store, {whitelist: ["main"]});
	// you want to remove some keys before you save
	let persister = persistStore(store, {
		whitelist: ["main"],
		transforms: [
			createBlacklistFilter("main", ["notificationMessages"])
		]
	});
	if (GetUrlVars().clearState)
		persister.purge();

	if (module.hot) {
		module.hot.accept("../../Store", () => {
			const reducers = require("../../Store").MakeRootReducer;
			store.replaceReducer(reducers(store.asyncReducers));
		});
	}

	return store;
}