/**************************************************************************************************************

    NAME
        thrak.ui.msgbox-1.1.1.js

    USAGE
	$. alert    ( msg, title, callback, options ) ;
	$. error    ( msg, title, callback, options ) ;
	$. confirm  ( msg, title, callback, options ) ;
	$. msgbox   ( msg, title, callback, flags, options ) ;
	$. inputbox ( msg, title, callback, options, field_definition ) ;

    DESCRIPTION
	Implements $.alert(), $.confirm() and $.error() with a little more customization than the available
	Javascript equivalents. Note that the arguments can be specified in any order ; the only constraint
	is that the window title must be the second string of the argument list, after the message to display.
	
    PARAMETERS
	msg (string) -
		Message to be displayed.

	title (string) -
		Title to be dsplayed. If none specifying, the current locale title is chosen, then the default
		title.

	calback (function) -
		Function called when the user will validate the message box.

	flags (integer) -
		A combination of MB_xxx flags.

	options (object) -
		Additional jQuery ui dialog options.

	field_definition (string) -
		Optional inputbox field definition. If not specified, a standard <input type="text"> field 
		is used.
				
    AUTHOR
        Christian Vigh, 12/2013.

    HISTORY
    [Version : 1.0]	[Date : 2013/12/05]     [Author : CV]
        Initial version.

    [Version : 1.1]	[Date : 2015/10/04]     [Author : CV]
	. Corrected the __show_alert() function which removed any buttons in the dialog box if object settings 
	  were specified through the alert/confirm/error functions.

    [Version : 1.1.1]	[Date : 2015/10/09]     [Author : CV]
	. Originally, the functions from msgbox implemented a close() function to remove the dialog definition
	  from the DOM. This approach however does not work when multiple dialogs are stacked : calling 
	  dialog ( 'close' ) will bubble and call the close() function of each underlying stacked dialog before
	  the close() method of the current one.
	  To prevent this, the __close_me() function has been added, which in turn calls the 'destroy' method
	  (instead of 'close').
	. Support has been added for the Escape and Enter keys.

    [Version : 1.2.0]	[Date : 2015/10/21]     [Author : CV]
	. Added the msgbox() and inputbox() functions.

    [Version : 1.2.1]	[Date : 2015/11/03]     [Author : CV]
	. Added the wait() function.

    [Version : 1.2.2]	[Date : 2016/09/22]     [Author : CV]
	. Added the possibility to define new buttons in the "options" parameter of the $.alert() and
	  $.error() functions.

 **************************************************************************************************************/

( function ( $, me )
   {
	// To allow stacking of several message boxes, a dialog div with a unique id will be created and appended to the end
	// of document body. This variable is incremented each time a new message box has to be created.
	var	unique_id	=  1 ;
	
	
	// alert function -
	//	Displays a message with a single Ok button. If a callback is specified, it will be called with a single 'status'
	//	parameter which will always be set to true.
	//	The default title for alert() is : "Message".
	$. alert	=  function  ( msg, title, callback, options )
	   {
		__show_alert ( "alert", arguments ) ;
	    }

	// error function -
	//	Same as alert() with a few color differences.
	$. error	=  function  ( msg, title, callback, options )
	   {
		__show_alert ( "error", arguments ) ;
	    }


	// confirm function -
	//	Displays a confirmation message with an Ok and Cancel button. If a callback function is specified, its "status"
	//	parameter will be set to true if the Ok button was clicked, and to false if it was the Cancel button.
	//	The default title for confirm() is : "Confirmation".
	$. confirm	=  function  ( msg, title, callback, options )
	  {
		__show_alert ( "confirm", arguments ) ;
	   }

	// msgbox function -
	//	For Windows programmers...
	$. msgbox	=  function  ( msg, title, flags, callback, options )
	   {
		__show_alert ( "msgbox", arguments ) ;
	    }


	// inputbox function -
	//	Asks for user input and returns the supplied value to the callback, or boolean false if the user
	//	cancelled the request.
	//	The field_definition parameter can be used to supply html code for defining the input field ; no
	//	id or name attribute is required, as the definition will automatically be handled by the inputbox()
	//	function ; note however that this parameter is a string and must be the 3rd string parameter of the
	//	call, after "msg" and "title".
	$. inputbox	=  function  ( msg, title, callback, options, field_definition )
	   {
		__show_alert ( "inputbox", arguments ) ;
	    }


	/***  MB_xxx constants  ***/
	// Button choice constants :
	$. msgbox. MB_OK			=  0x00000000 ;		// Message box contains a Ok button
	$. msgbox. MB_OKCANCEL			=  0x00000001 ;		// Message box contains two buttons : Ok and Cancel
	$. msgbox. MB_ABORTRETRYIGNORE		=  0x00000002 ;		// Message box contains three push buttons: Abort, Retry, and Ignore
	$. msgbox. MB_YESNOCANCEL		=  0x00000003 ;		// Message box contains three push buttons: Yes, No, and Cancel
	$. msgbox. MB_YESNO			=  0x00000004 ;		// Message box contains two push buttons: Yes and No
	$. msgbox. MB_RETRYCANCEL		=  0x00000005 ;		// Message box contains two push buttons: Retry and Cancel
	$. msgbox. MB_CANCELTRYCONTINUE		=  0x00000006 ;		// Message box contains three push buttons: Cancel, Try Again, Continue

	var	BUTTON_MASK			=  0x0000000F ;
	var	BUTTON_SHIFT			=  0 ;

	// Icon display options :
	$. msgbox. MB_ICONEXCLAMATION		=  0x00000080 ;		// Does not strictly follow Windows constants
	$. msgbox. MB_ICONWARNING		=  0x00000070 ;
	$. msgbox. MB_ICONINFORMATION		=  0x00000060 ;
	$. msgbox. MB_ICONASTERISK		=  0x00000050 ;
	$. msgbox. MB_ICONQUESTION		=  0x00000040 ;
	$. msgbox. MB_ICONSTOP			=  0x00000030 ; 
	$. msgbox. MB_ICONERROR			=  0x00000020 ; 
	$. msgbox. MB_ICONHAND			=  0x00000010 ;
	
	var	ICON_MASK			=  0x000000F0 ; 
	var	ICON_SHIFT			=  4 ;
 
	// Default button flags :
	$. msgbox. MB_DEFBUTTON1		=  0x00000000 ;
	$. msgbox. MB_DEFBUTTON2		=  0x00000100 ;
	$. msgbox. MB_DEFBUTTON3		=  0x00000200 ;
	$. msgbox. MB_DEFBUTTON4		=  0x00000300 ;

	var	DEFBUTTON_MASK			=  0x00000F00 ;
	var	DEFBUTTON_SHIFT			=  8 ;

	// Button ids returned to the callback function :
	$. msgbox. IDABORT			=  3 ;
	$. msgbox. IDCANCEL			=  2 ; 
	$. msgbox. IDCONTINUE			=  11 ;
	$. msgbox. IDIGNORE			=  5 ; 
	$. msgbox. IDNO				=  7 ;
	$. msgbox. IDOK				=  1 ;
	$. msgbox. IDRETRY			=  4 ;
	$. msgbox. IDTRYAGAIN			=  10 ;
	$. msgbox. IDYES			=  6 ; 
	$. msgbox. IDUSER			=  1000 ;	// User-supplied buttons can safely use ids starting with this value
	  
	// What to display if the caller forgot to specify a message ???
	var	message			=  "<span style='color: #FF0000'>The developer forgot to specify a message for this alert...</span>" ;

	// Default dialog titles and labels
	var	default_labels		=
	   {
		boxTitles		:
		  {
			alert			:  "Message", 
			error			:  "Error",
			confirm			:  "Confirmation",
			msgbox			:  "Message",
			inputbox		:  "Input value"
		   },  
		buttonLabels		:
		   {
			'ok'			:  "Ok",
			'cancel'		:  "Cancel",
			'abort'			:  "Abort",
			'retry'			:  "Retry",
			'ignore'		:  "Ignore",
			'continue'		:  "Continue",
			'try'			:  "Try again",
			'help'			:  "Help",
			'yes'			:  "Yes",
			'no'			:  "No"
		    }
	    } ;

	// Default dialog options. Make sure of what you're doing if you want to override the open() and close() functions !
	var	default_options		=
	   { 
		modal		:  true,
		width		:  "auto",
		closeOnEscape	:  true,
		height		:  "auto",
		maxWidth	:  800,
		resizable	:  false,
		stack		:  true,
		open		:  function ( )
		   {
			var	$this		=  $(this) ;
			var	defbutton	=  $this. dialog ( 'option', 'defaultButton' ) ;
			var	width		=  $this. width ( ) ;
			var	maxwidth	=  $this. dialog ( 'option', 'maxWidth' ) ;

			if  ( defbutton  !=  undefined )
				$('.ui-dialog-buttonpane button:eq(' + defbutton + ')', $this. parent ()). focus ( ) ;

			if  ( width  >  maxwidth )
			   {
				$this
					.css ( 'max-width', maxwidth + 'px' )
					.css ( 'overflow' , 'hidden' )
					.dialog ( 'option', 'position', $this. dialog ( 'option', 'position' ) ) ;
			    }
		    }
	     } ;

	// __close_me -
	//	Ensures the current message box is destroyed after calling the optional user callback.
	//	Calls the 'destroy' method insted of 'close', since the latter does not prevent event bubbling :
	//	This means that if you have multiple stacked dialogs, the close() method of each dialog will be
	//	called...
	function  __close_me ( $this, user_callback, status )
	   {
		// In case of an inputbox call, we substitute a "true" result with the value of the underlying
		// <input> or <textarea> field
		if  ( status  ===  true  &&  $this. dialog ( 'option', 'dialogType' )  ==  'inputbox' )
		   {
			var	$items ;

			$items	=  $('input', $this) ;

			if  ( $items. length  >  0 )
				status	=  $items. val ( ) ;

			$items	=  $('textarea', $this ) ;

			if  ( $items. length  >  0 )
				status	=  $items. val ( ) ;
		    }

		// Call the callback if one specified, providing the return value of the message box (ok, cancel, etc...).
		// For the $.alert() and $.error functions, this parameter will always be set to 1.
		user_callback  &&  user_callback ( status, $this ) ;
				
		// Since we're closing, we can remove our definition from the body of the document
		$this. dialog ( 'destroy' ) ;
		$this. remove ( ) ;
	    }
	     
	// __show_alert -
	//	Main entry point for displaying message boxes.
	function  __show_alert ( boxtype, args ) 
	    {
		var	$this		=  $(this) ;


		boxtype	=  boxtype. toLowerCase ( ) ;
		
		// Get labels from the current locale (if any)
		var	labels		=  default_labels ;

		if  ( $. locale )
			labels		=  $. extend ( labels, $. locale ( ). options. msgbox ) ;

		// Dialog options
		var	dialog_options	=  $. extend ( default_options, { title : labels. boxTitles [ boxtype ] } ) ;
		// User callback
		var	user_callback ;
		// Values for the Ok button (or Enter) and Cancel (or escape) ; may be changed to an IDxxx constant if the 
		// msgbox function is called
		var	idok		=  true,
			idcancel	=  false ;
		
		// Loop through the arguments provided to alert(), error(), confirm(), etc...
		var	got_message		=  false,
			got_title		=  false ;
		var	message,
			field_definition	=  '<input type="text" size="50"/>' ;
		var	msgbox_flags		=  0 ;
		var	icon			=  undefined ;
		
		for  ( var i = 0 ; i < args. length ; i ++ )
		   {
			var	argument	=  args [i] ;			// Argument value
			var	argtype		=  typeof ( argument ) ;	// Argument type


			argtype		=  argtype. toLowerCase ( ) ;

			// Automatic conversions
			switch  ( argtype )
			   {
				// Promote boolean and numeric arguments to string
				case  'boolean' :
					argument	=  argument. toString ( ) ;
					argtype		=  'string' ;
					break ;

				case  'number' :
					if  ( boxtype  !=  'msgbox' )
					   {
						argument	=  argument. toString ( ) ;
						argtype		=  'string' ;
					    }
					break ;

				// Strings : check if we have an <input> or <textarea> field ; in this case, 
				// set the pseudo-parameter type 'html'
				case  'string' :
					if  ( argument. indexOf ( '<input' )  >=  0  ||  argument. indexOf ( '<textarea' )  >=  0 )
						argtype		=  'html' ;
			    }			
			
			// Process current argument
			switch  ( argtype )
			   {
				// String type -
				//	if we encounter it for the first time, it is the message to display. For the second time, it is the title.       
				case	'string' :
					if  ( got_message )
					   {
						dialog_options. title	=  argument ;
						got_title		=  true ;
					    }
					else
					   {
						message		=  argument ;
						got_message	=  true ;
					    }
					break ;

				// 'html' pseudo-type : this is an input field definition
				case	'html' :
					field_definition	=  argument ;
					break ;

				// Function type -
				//	This is the calback to be called upon user validation.
				case	'function' :
					user_callback	=  argument ;
					break ;
					
				// Object type -
				//	This is a structure specifying dialog options to be merged with the default ones.
				case	'object' :
					dialog_options	=  $. extend ( dialog_options, argument ) ;
					break ;

				// Integer type : msgbox options
				case	'number' :
					msgbox_flags	=  argument ;
					break ;
									
				// Other type : panic !
				default :
					throw ( "Unexpected argument of type '" + argtype + "'" ) ;
			    }
		    }	 
		
		// Depending on the message box type, captions and buttons may differ...
		dialog_options. dialogType	=  boxtype ;

		switch  ( boxtype )
		   {
			// Confirmation box : we should have an Ok and Cancel button
			case	"confirm" :
				dialog_options. buttons	=
				   [
					{
						html	:  labels. buttonLabels [ 'ok' ],
						click	:  function ( e ) { __close_me ( $this, user_callback, true ) ; }
					 },
					{
						html	:  labels. buttonLabels [ 'cancel' ],
						click	:  function ( e ) { __close_me ( $this, user_callback, false ) ; }
					 }
				    ] ;

				break ;    
			
			// Input box : we should have an Ok and Cancel button
			case	"inputbox" :
				dialog_options. buttons	=
				   [
					{
						html	:  labels. buttonLabels [ 'ok' ],
						click	:  function ( e ) { __close_me ( $this, user_callback, true ) ; }
					 },
					{
						html	:  labels. buttonLabels [ 'cancel' ],
						click	:  function ( e ) { __close_me ( $this, user_callback, false ) ; }
					 }
				    ] ;

				break ;    
			
			// Msgbox message box : almost the same as on Windows platforms...
			case	"msgbox" :
			   {
				var	button_flag	=  ( msgbox_flags & BUTTON_MASK    )  >>  BUTTON_SHIFT,
					icon_flag	=  ( msgbox_flags & ICON_MASK      ),
					defbutton_flag	=  ( msgbox_flags & DEFBUTTON_MASK )  >>  DEFBUTTON_SHIFT ;

				switch  ( button_flag )
				   {
					case	$. msgbox. MB_OKCANCEL :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'ok' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDOK ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'cancel' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDCANCEL ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDOK ;
						idcancel	=  $. msgbox. IDCANCEL ;
						break ;
						
					case	$. msgbox. MB_YESNO :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'yes' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDYES ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'no' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDNO ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDYES ;
						idcancel	=  $. msgbox. IDNO ;
						break ;
						
					case	$. msgbox. MB_YESNOCANCEL :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'yes' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDYES ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'no' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDNO ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'cancel' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDCANCEL ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDYES ;
						idcancel	=  $. msgbox. IDCANCEL ;
						break ;
						
					case	$. msgbox. MB_RETRYCANCEL :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'retry' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDRETRY ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'cancel' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDNCANCEL ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDRETRY ;
						idcancel	=  $. msgbox. IDCANCEL ;
						break ;
						
					case	$. msgbox. MB_ABORTRETRYIGNORE :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'abort' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDABORT ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'retry' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDRETRY ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'ignore' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDIGNORE ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDABORT ;
						idcancel	=  $. msgbox. IDIGNORE ;
						break ;
						
					case	$. msgbox. MB_CANCELTRYCONTINUE :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'cancel' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDCANCEL ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'try' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDTRY ) ; }
							 },
							{
								html	:  labels. buttonLabels [ 'continue' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDCONTINUE ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDTRY ;
						idcancel	=  $. msgbox. IDCANCEL ;
						break ;
						
					case	$. msgbox. MB_OK :
					default :
						dialog_options. buttons	=
						   [
							{
								html	:  labels. buttonLabels [ 'ok' ],
								click	:  function ( e ) { __close_me ( $this, user_callback, $. msgbox. IDOK ) ; }
							 }
						    ] ;

						idok		=  $. msgbox. IDOK ;
						idcancel	=  $. msgbox. IDOK ;
						break ;
						
				    }

				if  ( defbutton_flag  >  dialog_options. buttons. length )
					defbutton_flag	=  dialog_options. buttons. length ;

				dialog_options. defaultButton	=  defbutton_flag ;

				switch ( icon_flag )
				   {
					case  $. msgbox. MB_ICONEXCLAMATION	:  icon	=  'MB_ICONEXCLAMATION'		; break ;
					case  $. msgbox. MB_ICONWARNING		:  icon	=  'MB_ICONWARNING'		; break ;
					case  $. msgbox. MB_ICONINFORMATION	:  icon	=  'MB_ICONINFORMATION'		; break ;
					case  $. msgbox. MB_ICONASTERISK	:  icon	=  'MB_ICONASTERISK'		; break ;
					case  $. msgbox. MB_ICONQUESTION	:  icon	=  'MB_ICONQUESTION'		; break ;
					case  $. msgbox. MB_ICONSTOP		:  icon	=  'MB_ICONSTOP'		; break ;
					case  $. msgbox. MB_ICONERROR		:  icon	=  'MB_ICONERROR'		; break ;
					case  $. msgbox. MB_ICONHAND		:  icon	=  'MB_ICONHAND'		; break ;
				    }

				if  ( icon  !==  undefined )
					icon	=  me. dirname + '/images/' + icon + '.png' ;

				break ;
			    }

			// Alert/error message box : There is a single Ok button, unless the caller has specified 
			// additional buttons.
			case	"alert" :
			case	"error" : 
			default :
				// No button defined by the caller
				if  ( dialog_options. buttons  ===  undefined )
					dialog_options. buttons		=  [] ;
				// Buttons have been defined by the caller : wrap the callback specified for the "click" entry so
				// that we are able to close the box afterwards
				else 
				   {
					for  ( var  i = 0 ; i  < dialog_options. buttons. length ; i ++ )
					   {
						var	button		=  dialog_options. buttons [i],
							callback	=  button. click,
							retval		=  ( button. returns ) ?  button. returns : true ;
						
						button. click	=  function ( e )
						   {
							var	status	=  callback ( e ) ;

							if  ( status  ===  false )
								return ;

							__close_me ( $this, user_callback, retval ) ;
							dialog_options. buttons		=  undefined ;
						    }
					    }
				     }

				// There will always be an Ok button
				dialog_options. buttons. push
				   (
					{
						html	:  labels. buttonLabels [ 'ok' ],
						click	:  function ( e ) { __close_me ( $this, user_callback, true ) ; dialog_options. buttons	=  undefined ; }
					 }
				    ) ;
		    }

		// If an input box was requested, add the code for the input field
		var	input_field		=  '' ;

		if  ( boxtype  ==  'inputbox' )
		   {
			input_field	=  '<div class="' + 'ui-popup-dialog-input ui-' + boxtype + '-dialog-input">' +
						field_definition +
					   '</div>' ;
		    }

		// If an icon has been specified, then we need to wrap both the icon and the message within a table
		var	wrapper_start		=  '',
			wrapper_end		=  '' ;

		if  ( icon  !==  undefined )
		   {
			wrapper_start		=  '<table width="100%" cellpadding="0" cellspacing="0">' +
						   '<tr>' +
						   '	<td class="ui-popup-dialog-icon-cell ui-' + boxtype + '-dialog-icon-cell">' +
						   '		<div class="ui-popup-dialog-icon ui-' + boxtype + '-dialog-icon">' +
						   '			<img src="' + icon + '"/>' +
						   '		</div>' +
						   '	</td>' +
						   '	<td class="ui-popup-dialog-message-cell ui-' + boxtype + '-dialog-message-cell">' ;
			wrapper_end		=  '</td></tr></table>' ;
		    }
				
		// Wrap the message in a <div>
		message		=  wrapper_start +
				   '<div class="' + 'ui-popup-dialog-message ui-' + boxtype + '-dialog-message">' +
					message + 
				   '</div>' +
				   input_field + 
				   wrapper_end ;
		   
		// Generate a unique dialog id		
		var	dialog_id		=  "msgbox-alert-" + unique_id ++ ;
		var	dialog_selector		=  '#' + dialog_id ;
		    
		// Append the dialog definition (well, the <div> containing the message to display) to the end of the document body.
		$('body'). append ( "<div id='" + dialog_id + "' style='display: none'>" + message + "</div>" ) ;

		// Set dialog options
		var	$this		=  $(dialog_selector) ;

		$this. dialog ( dialog_options ) ;

		// Add some classes to allow the caller for customization. 
		// Classes are : ui-msgbox-content and ui-msgbox-xxx-content, where 'xxx' stands for the message box
		//               type (alert, error, confirm, ...)
		var	$parent		=  $this. parent ( ) ;

		$this. addClass ( 'ui-popup-dialog-message ui-' + boxtype + '-dialog-message' ) ;
			
		$('.ui-button', $parent). 
			addClass ( 'ui-popup-dialog-button ui-' + boxtype + '-dialog-button' ) ;
		$('.ui-dialog-titlebar', $parent). 
			addClass ( 'ui-popup-dialog-titlebar ui-' + boxtype + '-dialog-titlebar' ) ;
		$('.ui-dialog-title', $parent). 
			addClass ( 'ui-popup-dialog-title ui-' + boxtype + '-dialog-title' ) ;
		$('.ui-button-icon-only', $parent). 
			addClass ( 'ui-popup-button-icon-only ui-' + boxtype + '-button-icon-only' ) ;
		$('.ui-dialog-buttonset', $parent). 
			addClass ( 'ui-popup-dialog-buttonset ui-' + boxtype + '-dialog-buttonset' ) ;
		$('.ui-button-text', $parent). 
			addClass ( 'ui-popup-dialog-button-text ui-' + boxtype + '-dialog-button-text' ) ;

		// Handle the click on the close (X) button as the ESCAPE key or a click on the Cancel button, if any
		$(".ui-dialog-titlebar-close", $parent). click
		   (
			function  ( e )
			   {
				$this. killEvent ( e ) ;

				__close_me ( $this, user_callback, false ) ;

				return ( true ) ;
			    }
		    ) ;

		// Handle escape and enter keys :
		//	Escape cannot be handled by keyup() because it is processed by the keydown() event ;
		//	whereas Enter MUST be processed in keypress(), not keydown().
		$parent. keydown
		   (
			function ( e )
			   {
				if  ( e. keyCode  ===  $. ui. keyCode. ESCAPE )
				   {
					$this. killEvent ( e ) ;
					__close_me ( $this, user_callback, idcancel ) ;
					return ( true ) ;
				    }
			    }
		    ) ;

		$parent. keypress
		   (
			function ( e )
			   {
				if  ( e. keyCode  ===  $. ui. keyCode. ENTER )
				   {
					$this. killEvent ( e ) ;
					__close_me ( $this, user_callback, idok ) ;
					return ( true ) ;
				    }
			    }
		    ) ;

		// textarea input fields -
		//	Catch the Enter key to insert a newline in the input text.
		$('textarea', $parent). keypress
		   (
			function  ( e )
			   {
				var	$this	=  $(this) ;

				if  ( e. keyCode  ===  $. ui. keyCode. ENTER )
				   {
					$this. killEvent ( e ) ;
					$this. val ( $this. val ( ) + "\n" ) ;
					return ( false ) ;
				    }
			    }
		    ) ;

		// textarea input fields -
		//	The combination of Ctrl+Tab will insert a tabulation in the input text.
		//	Note that the keydown event is not appropriate, since it will be called twice : once for the Ctrl key,
		//	once for the tab key (in this case, e. ctrlKey will be false). keypress is not good either, since 
		//	the tab key is intercepted before any transformation into a key press.
		$('textarea', $parent). keyup
		   (
			function  ( e )
			   {
				var	$this	=  $(this) ;

				if  ( e. keyCode  ===  $. ui. keyCode. TAB  &&   e. ctrlKey )
				   {
					$this. killEvent ( e ) ;
					$this. val ( $this. val ( ) + "\t" ) ;
					return ( false ) ;
				    }
			    }
		    ) ;


		// Open the dialog
		$this. dialog ( 'open' ) ;
	    }
	    

	// $.wait -
	//	Displays/hides a waiting message during long operations. Note that only one wait message can be displayed at 
	//	a time. Trying to open a second wait message while a first one is already opened will close the first one
	//	before opening the second.
	//	Can be called with the following parameters :
	//	$. wait ( message ) -
	//		Displays the specified message using the default icon. 
	//	$. wait ( options ) -
	//		Displays a message using the specified options object, which can have the following members :
	//		- message :
	//			The message to be displayed
	//		- icon :
	//			Animated image to display.
	//	$. wait ( ) -
	//		Closes any opened box.
	var	waitDialogId	=  'ui-wait-dialog' ;
	var	$waitDialog	=  undefined ;

	$. wait		=  function ( )	
	   {
		if  ( arguments. length  ==  0 )
		   {
			if  ( $waitDialog  !==  undefined )
			   {
				$waitDialog. dialog ( 'destroy' ) ;
				$waitDialog. remove ( ) ;
				$waitDialog	=  undefined ;
			    }

			return ;
		    }

		var	options	;

		if  ( typeof ( arguments [0] )  ===  'string' )
			options		=  { message : arguments [0], icon : undefined } ;
		else if  ( typeof ( arguments [0] )  ==  'object' )
			options		=  $. extend ( {}, options ) ;	
		else
			options		=  { message : undefined, icon : undefined } ;
		
		var	dialog_def	=  '<div id="' + waitDialogId + '" class="ui-wait-dialog">' +
					   '<div class="ui-wait-dialog-message"></div>' +
					   '<div class="ui-wait-dialog-icon"><div></div></div>' +
					   '</div>' ;

		$('body'). append ( dialog_def ) ;

		var	$this		=  $('#' + waitDialogId ) ;

		if  ( options. message  ===  undefined )
			$('.ui-wait-dialog-message', $this). addClass ( 'ui-wait-dialog-message-default' ) ;
		else
			$('.ui-wait-dialog-message', $this). html ( options. message ) ;

		if  ( options. icon  ===  undefined )
			$('.ui-wait-dialog-icon', $this). addClass ( 'ui-wait-dialog-icon-default' ) ;
		else
			$('.ui-wait-dialog-icon', $this). html ( '<img src="' + options. icon + '"/>' ) ;

		var	dialog_options	=
		   {
			modal		:  true,
			autoOpen	:  false,
			width		:  "auto",
			height		:  "auto",
			closeOnEscape	:  false,
			resizable	:  false,
			stack		:  true,
			open		:  function ( )
			   {
				$(this). siblings ( 'div.ui-dialog-titlebar'). remove ( ) ;
				$('.ui-widget-overlay'). css ( 'opacity', '0.50' ) ;
			    }
		    }

		$this. dialog ( dialog_options ). dialog ( 'open' ) ;

		$waitDialog	=  $this ;
	    }


    } ) ( jQuery, ( $. script ) ?  $. script ( ) : undefined ) ;
