// @@@LICENSE
//
//      Copyright (c) 2010-2012 Hewlett-Packard Development Company, L.P.
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
// LICENSE@@@

// AccountManager

enyo.kind({
	name: "AccountManager",
	kind: "Pane",
	flex:1,
	capability: undefined,
	components: [
		// The first view shows "Loading Accounts ..."
		{kind: "VFlexBox", name: "loadingAccounts", className:"enyo-bg", components: [
		{kind:"Toolbar", className:"enyo-toolbar-light accounts-header", pack:"center", components: [
				{kind: "Image", src: "images/acounts-48x48.png"},
				{kind: "Control", content: AccountsUtil.PAGE_TITLE_ACCOUNTS}
			]},
			{className:"accounts-header-shadow"},
			{kind: "HFlexBox", className:"box-center", flex:1, pack:"center", align:"center", components: [
				{kind:"Spinner", name: "getAccountsSpinner"},
				{content: $L("Loading Accounts...")}
			]},
		]},
		// The second view is the main Accounts view
		{kind: "VFlexBox", name: "prefsAndAccounts", className:"enyo-bg", components: [
			{kind:"Toolbar", className:"enyo-toolbar-light accounts-header", pack:"center", components: [
				{kind: "Image", src: "images/acounts-48x48.png"},
				{kind: "Control", content: AccountsUtil.PAGE_TITLE_ACCOUNTS}
			]},
			{className:"accounts-header-shadow"},
			{kind: "Scroller", flex: 1, components: [
				{kind:"Control", className:"box-center", components: [
					{kind: "RowGroup", className:"accounts-group", caption:$L("HP WEBOS ACCOUNT"), components: [
						{kind: "Item", layoutKind: "HFlexLayout", tapHighlight: true, disabled:true, className:"enyo-single" , onclick: "editPalmidProfile", align:"center", components:[
							{kind: "Image", name: "profileIcon", className:"icon-image"},
							{name:"palmProfileName", className:"enyo-text-ellipsis", flex:1}
						]}
					]},                                        
					{kind: "RowGroup", className:"accounts-group", name: "synergyAccounts", caption:$L("SYNERGY ACCOUNTS"), components: [
						// This is the one-line kind to get the list of accounts.  It is initialized in your create method below                                 
						{kind: "Accounts.accountsList", name: "accountsList", onAccountsList_AccountSelected: "editAccount", onAccountsList_Ready: "listReady"}
					]},
					{kind: "RowGroup", className:"accounts-group", name: "simAccountGroup", components: [
						{kind: "Accounts.accountsList", name: "SIMAccountsList", onAccountsList_AccountSelected: "editAccount", onAccountsList_Ready: "listReady"}
					]},
					// You'll probably want an "Add Account" button
					{kind: "Button", label: $L("Add an Account"), className:"enyo-button-dark accounts-btn", onclick: "AddAccount"}
				]}
			]},
		]},
		// This kind controls the view when a user is adding  an account.  You should switch to this view when
		// the user taps on the "Add Account" button and return to the "prefsAndAccounts" view when
		// onAccountsUI_Done event is received
		{kind: "AccountsUI", name: "AccountsView", lazy:true, capability: this.capability, onAccountsUI_Done: "accountsDone"},

		// If your app is 'EMAIL' then you need to define your "Edit account" view here.  Otherwise use this view
		// "components" is optional, but it allows you to specify additional preferences on the page that will appear
		// under the "Remove Account" button.  All events generated by these components are forwarded to your app.
		{kind: "AccountsModify", name: "AccountsModify", lazy:true, capability: this.capability, onAccountsModify_Done: "accountsDone"},

		{kind: "MyApps.PalmID",  name: "palmprofile", lazy:true, capability: this.capability, onAccountsModify_Done: "accountsDone"},
		{kind: "Accounts.getAccounts", name: "accounts", onGetAccounts_AccountsAvailable: "onAccountsAvailable"},
		{kind:"VFlexBox", components: [
			{name: "appMenu", kind: "AppMenu", components: [{kind: "HelpMenu", target: "http://help.palm.com/accountsmgr/index.html"}]},
		]},
		
		{kind: "PalmService", name: "getPalmProfileAccountInfo", service: "palm://com.palm.accountservices/", method: "getAccountInfo", onSuccess: "setPalmProfileNameSuccess"},
		{kind: "PalmService", name: "modifyPalmProfileAccountName", service: enyo.palmServices.accounts, method: "modifyAccount"},
	],
	
	create: function() {
		this.inherited(arguments);
		
		// Setup the Accounts and SIM lists first so that they are available as soon and the view renders
		this.lists = 0;
		this.$.accountsList.getAccountsList(this.capability, ['com.palm.palmprofile', 'com.palm.sim']);
		this.$.SIMAccountsList.getAccountsList('com.palm.sim');
		
		// Start the spinner
		this.$.getAccountsSpinner.show();
		
	},
	
	listReady: function () {
		// One of the Accounts or SIM lists is ready to be rendered
		this.lists++;
		
		// If both lists are ready, get the list of accounts so that the entire view can be drawn
		if (this.lists === 2)
			this.$.accounts.getAccounts();
	},
	
	// App was launched to change credentials
	windowParamsChangeHandler: function(inSender, inEvent) {
		var p = inEvent.params;
		if (p && p.launchType === "changelogin" && p.accountId) {
			console.log("Accounts app: Change credentials for " + p.accountId);
			// Wait until all the accounts are retrieved before acting on this information
			this.changeLoginAccountId = p.accountId;
		}
	},
	
	// App was already running when credential dashboard was tapped
	applicationRelaunchHandler: function(inSender, inEvent) {
		var p = inEvent.params;
		if (p && p.launchType === "changelogin" && p.accountId) {
			console.log("Accounts app: Change credentials for " + p.accountId);
			
			// Are the accounts available?
			if (this.accounts) {
			// Find the account
				for (var i=0, l=this.accounts.length; i<l; i++) {
					if (this.accounts[i]._id === p.accountId) {
						this.selectViewByName("AccountsModify");
						this.$.AccountsModify.ModifyCredentials(this.accounts[i]);
					}
				}			
			}
			else {
				// Wait until all the accounts are retrieved before acting on this information
				this.changeLoginAccountId = p.accountId;
			}
		}
	},
	
	onAccountsAvailable: function(inSender, inResponse) {
		this.accounts = inResponse.accounts;    // Accounts are returned as an array
		this.templates = inResponse.templates;
		var simAccounts = 0;
		
		// Separate the Profile and SIM accounts from the others
		this.accounts = this.accounts.filter(function(account) {
			if (account.templateId === "com.palm.palmprofile") {
				if (this.palmProfileAccount === undefined)  {
					//Jira: CWS-4249
					//We just want to reset the account name if for some reason it changed on the server. 
					this.$.getPalmProfileAccountInfo.call({});
				}
				this.palmProfileAccount = account;

				return false;
			}
			if (account.templateId === "com.palm.sim") {
				simAccounts++;
				return false;
			}
			return true;
		}.bind(this));
		
		// Update the Profile username and icon
		this.$.palmProfileName.setContent(enyo.string.escapeHtml(this.palmProfileAccount.username));
		this.$.profileIcon.src = this.palmProfileAccount.icon.loc_32x32;
		this.$.profileIcon.srcChanged();
		
		// Change the SIM header based on the number of SIM Accounts
		if (simAccounts === 0)
			this.$.simAccountGroup.hide();
		else {
			this.$.simAccountGroup.show();
			var t = new enyo.g11n.Template($L("1#SIM ACCOUNT|#SIM ACCOUNTS"));
			this.$.simAccountGroup.setCaption(t.formatChoice(simAccounts, {}));
		}
		
		// Show the list of accounts if more than 1 account
		if (this.accounts.length >= 1)
			this.$.synergyAccounts.show();
		else
			this.$.synergyAccounts.hide();
		
		// Was the accounts app launched to change credentials?
		if (this.changeLoginAccountId) {
			// Find the account
			for (var i=0, l=this.accounts.length; i<l; i++) {
				if (this.accounts[i]._id === this.changeLoginAccountId) {
					delete this.changeLoginAccountId;
					this.selectViewByName("AccountsModify");
					this.$.AccountsModify.ModifyCredentials(this.accounts[i]);
				}
			}			
		}
		else {
			// Go to the Accounts view, if the current view is "Loading Accounts"
			if (this.getViewName() === "loadingAccounts") {
				this.selectViewByName("prefsAndAccounts");

				// Prepare other views so they are ready when the user needs them
				setTimeout(enyo.bind(this, "PrepareViews"), 500);
			}
		}
	},
	
	// Prepare the other views for display
	PrepareViews: function() {
		this.$.getAccountsSpinner.hide();
		this.validateView("AccountsView");
		this.validateView("AccountsModify");
	},

	// "Add Account" button was tapped
	AddAccount: function(button) {
		this.selectViewByName("AccountsView");
		this.$.AccountsView.AddAccount(this.templates);
	},
	
	editPalmidProfile:  function(inSender, inResults) {
		console.log("editPalmidProfile")
		this.selectViewByName("palmprofile");
		this.$.palmprofile.initialize({palmProfileAccount: this.palmProfileAccount});
	},
	
	setPalmProfileNameSuccess: function(inSender, inResponse) {
		console.log("setPalmProfileNameSuccess");
		var accountName = inResponse.firstName + " " + inResponse.lastName;
		
		var param = {
			"accountId": this.palmProfileAccount._id,
			"object": {"username": accountName}
		}
		
		console.log("PalmProfileName: " + JSON.stringify(param));
		// Modify the account
		this.$.modifyPalmProfileAccountName.call(param);
    },

		
	// User tapped on account to edit
	editAccount: function(inSender, inResults) {
		this.selectViewByName("AccountsModify");
		this.$.AccountsModify.ModifyAccount(inResults.account);
	},
	
	// Go to the prefs and accounts view
	accountsDone: function(inSender, e) {
		this.selectViewByName("prefsAndAccounts");
	},
	
	// Open or close the App Menu
	openAppMenuHandler: function() {
		this.$.appMenu.open();
	},
	closeAppMenuHandler: function() {
		this.$.appMenu.close();
	}	
});

