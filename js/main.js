/*
 * AMULet - AOS MinUs LOS
 * 
 * Process and detect temporal visibility hole between
 * satellite acquistion station by comparing AOS (Acquisition Of Signal) and
 * LOS (Limit Of Signal) dates
 *
 * Copyright Jérôme Gasperi, 2012.09.03
 *
 * jerome[dot]gasperi[at]gmail[dot]com
 *
 * This software is a computer program whose purpose is a webmapping application
 * to display and manipulate geographical data.
 *
 * This software is governed by the CeCILL-B license under French law and
 * abiding by the rules of distribution of free software.  You can  use,
 * modify and/ or redistribute the software under the terms of the CeCILL-B
 * license as circulated by CEA, CNRS and INRIA at the following URL
 * "http://www.cecill.info".
 *
 * As a counterpart to the access to the source code and  rights to copy,
 * modify and redistribute granted by the license, users are provided only
 * with a limited warranty  and the software's author,  the holder of the
 * economic rights,  and the successive licensors  have only  limited
 * liability.
 *
 * In this respect, the user's attention is drawn to the risks associated
 * with loading,  using,  modifying and/or developing or reproducing the
 * software by the user in light of its specific status of free software,
 * that may mean  that it is complicated to manipulate,  and  that  also
 * therefore means  that it is reserved for developers  and  experienced
 * professionals having in-depth computer knowledge. Users are therefore
 * encouraged to load and test the software's suitability as regards their
 * requirements in conditions enabling the security of their systems and/or
 * data to be ensured and,  more generally, to use and operate it in the
 * same conditions as regards security.
 *
 * The fact that you are presently reading this means that you have had
 * knowledge of the CeCILL-B license and that you accept its terms.
 */

/*
 * =========== FUNCTIONS ==================
 */

/*
 * Format a javascript date object to ISO 8601
 * 
 * @input date : a javascript date object
 * @return an ISO8601 date string (i.e. YYYY.MM.DDTHH:MM:SS)
 */
function toISO8601(date) {

    if (!date || !$.isFunction(date.getMonth)) {
        return '-';
    }
            
    var m = "" + (date.getMonth() + 1),
    d = "" + date.getDate(),
    h = date.getHours(),
    mn = date.getMinutes(),
    s = date.getSeconds();
            
    return date.getFullYear() + "-" + pad(m,2) + "-" + pad(d,2) + 'T' + pad(h,2) + ':' + pad(mn,2) + ':' + pad(s,2);
}

/*
 * Pad an integer with leading 0
 * 
 * @input number : an integer
 * @input length : length of the resulting string
 * @return a padded string (e.g. pad(7,3) will return "007")
 */
function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

/*
 * Parse the AOS/LOS stations file and return a usable javascript array
 * of stations parameters
 * 
 * HYPOTHESIS :
 * ------------
 * 
 * 1. It is assumed that the AOS/LOS station file is a text as follow :
 * 
 *
    Created on : Fri Sep 28 13:21:54 GMT 2012

    CNES  TOULOUSE FRANCE - ORBIT COMPUTATION CENTER 
    ------------------------------------------------
    Mail : xxx@xxx
    Tel  : xx.xx.xx.xx.xx  Fax  : xx.xx.xx.xx.xx 



    SATELLITE: XXXXX      INTERNATIONAL NUMBER: XXXXX
    REFERENCE ORBITAL PARAMETERS: XXXXX (traj)

    ANTENNA         T  AOS                        ELEV    AZIM  LOS                        ELEV    AZIM  MAX                        ELEV    AZIM
    (UT time)          DD/MM/YYYY HH:MN:SS.SSS     deg     deg  DD/MM/YYYY HH:MN:SS.SSS     deg     deg  DD/MM/YYYY HH:MN:SS.SSS     deg     deg

    STATION_A       ~           -            -       -       -  20/10/2012 05:34:12.265  -0.000  33.872           -            -       -       -
    STATION_B       ~           -            -       -       -  20/10/2012 00:42:36.638  -0.000 143.674           -            -       -       -
    STATION_C       ~  20/10/2012 01:41:11.245   0.000 219.736  20/10/2012 13:27:40.028  -0.000 155.043  20/10/2012 09:38:02.121  61.153  75.690
    STATION_D       ~  20/10/2012 05:05:06.855   0.000  39.517  20/10/2012 09:09:37.438  -0.000 337.947  20/10/2012 07:07:25.501  22.028   8.272
    STATION_E       ~  20/10/2012 09:29:20.942   0.000 295.419  20/10/2012 10:32:41.167  -0.000 273.193  20/10/2012 09:58:55.770   0.638 285.185
    STATION_F       ~  20/10/2012 13:19:05.398   0.000 217.893  21/10/2012 02:28:12.481  -0.000 125.748  20/10/2012 18:01:20.432  84.289 269.301
    STATION_G       ~  20/10/2012 14:53:21.696   0.000 217.306  20/10/2012 16:57:41.907  -0.000 256.573  20/10/2012 15:53:26.348   4.213 235.248
    STATION_H       ~  20/10/2012 15:54:31.530   0.000 215.215  21/10/2012 02:55:23.462  -0.000 151.310  20/10/2012 22:35:26.747  57.807  44.806
    ...etc...

 * 
 * 2. It is assumed that the first 15 lines are not used (i.e. only line starting at "STATION_A" are processed)
 * 
 * @input txt : input text read from AOS/LOS station file
 * @input start : line processing start - default is 15 if not defined
 * 
 * @return a comprehensive array of station information - structure is as follow
 *          [
 *              {
 *                  station: //station identifier
 *                  aos: // Acquisition Of Signal date
 *                  los: // Limit Of Signal date
 *                  active: // boolean - true if station is active
 *              },
 *              ...etc...
 *          ]
 * 
 */
function parse(txt, start) {

    var aosd, aost, aos, losd, lost, los, cols, station, line, lines, numLines, i, stations = [];
    
    if (!txt) {
        return stations
    }
    
    /*
     * Default start line is 15
     */
    start = start|| 15;
    
    /*
     * Process text
     */
    lines = txt.split("\n");
    numLines = lines.length;
    for (i = start; i < numLines; i++) {
     
        /*
        * Line structure (we only care of AOS and LOS)
        *
        * NAME            ?  AOS                       ?     ?        LOS                      ?
        * STATION_X   ~  20/10/2012 01:41:11.245   0.000 219.736  20/10/2012 13:27:40.028  -0.000 155.043  20/10/2012 09:38:02.121  61.153  75.690
        *
        * Interresting columns are :
        *  0 - station name
        *  2 - AOS date
        *  3 - AOS time
        *  6 - LOS date
        *  7 - LOS time
        */
        line = lines[i];
        cols = line.split(/\s+/g);
        station = cols[0];
        if (cols[2] && cols[2] !== "-") {
            aosd = cols[2].split("/");
            aost = cols[3].split(":");
            aos = new Date(parseInt(aosd[2],10), parseInt(aosd[1],10), parseInt(aosd[0],10), parseInt(aost[0],10), parseInt(aost[1],10), parseFloat(aost[2]));
        }
        else {
            aos = null;
        }
        if (cols[6] && cols[6] !== "-") {
            losd = cols[6].split("/");
            lost = cols[7].split(":");
            los = new Date(parseInt(losd[2],10), parseInt(losd[1],10), parseInt(losd[0],10), parseInt(lost[0],10), parseInt(lost[1],10), parseFloat(lost[2]));
        }
        else {
            los = null;
        }
        
        /*
         * Add station
         */
        if (aos || los) {
            stations.push({
                id:"id"+i,
                name:station,
                aos:aos,
                los:los,
                active:true
            });
        }
    }
    
    return stations;
}

/*
 * Display result of stations computation
 *
 */
function display() {
    
    var i, j, l, station, pStation, delta, deltam, deltah, $s, self = this;
    
    /*
     * Clean previous result
     */
    $('#result').empty();
    $('#result').append('<tr><th></th><th>Station</th><th>AOS</th><th>LOS</th><th>Difference</th><th>minutes</th><th>hours</th><th></th></tr>');

    pStation = null;
    
    /*
     * Process stations
     */
    for (i = 0, l = self.stations.length; i < l; i++) {
    
        station = self.stations[i];
        delta = '';
        deltam = '';
        deltah = '';
        j = i - 1;
        
        /*
         * Process only active station
         */
        if (station.active) {
            
            /*
             * Find the first previous station that is active
             */
            while (j > -1) {
                pStation = self.stations[j];
                if (pStation.active) {
                    if (station.aos && pStation.los) {
                        delta = 'AOS[' + i + ']&nbsp;-&nbsp;LOS[' + j + ']';
                        deltam = ((station.aos - pStation.los) / 1000 / 60).toFixed(2);
                        deltah = (deltam / 24).toFixed(3);
                        break;
                    }
                }
                j--;
            }
            
        }
     
        /*
         * Append result
         */
        $('#result').append('<tr id="'+station.id+'"><td>' + i + '.</td><td>' + station.name + '</td><td>' + toISO8601(station.aos) + '</td><td>' + toISO8601(station.los) + '</td><td>' + delta + '</td><td>' + deltam + '</td><td>' + deltah + '</td><td><a href="#"><img src="img/' + (station.active ? 'remove.png' : 'add.png') + '"></a></td></tr>');
        
        /*
         * Add classes hilite and removed
         */
        $s = $('#'+station.id);
        if (deltam !== '' && deltam > 0) {
            $s.addClass("hilite");
        }
        else {
            $s.removeClass("hilite");
        }
        
        if (!station.active) {
            $s.addClass("removed");
        }
        
        /*
         * Set action on station
         */
        (function($d){
            $('a', $d).click(function(e){
                
                e.preventDefault();
                e.stopPropagation();
                
                /*
                 * Remove station and recompute
                 */
                var s = getStation($d.attr('id'));
                if (s) {
                    s.active = !s.active;
                }
                
                /*
                 * Update display
                 */
                display();
                
                return false;
            });
        })($s);
    }
    
    
}

/*
 * Get a station
 */
function getStation(identifier) {
    
    var i, l, self = this;
    
    for (i = 0, l = self.stations.length; i < l; i++) {
        if (identifier === self.stations[i].id) {
            return self.stations[i];
        }
    }
    
    return null;
}

/*
 * ========================================
 */

/*
 * Set Drag and Drop listener
 */
var $ddzone = $('#drop_zone');
var stations = [];
var self = this;

$ddzone.bind('dragleave',
    function(e) {
        $ddzone.removeClass('hover');
        e.preventDefault();
        e.stopPropagation();
    });
    
$ddzone.bind('dragover',
    function(e) {
        $ddzone.addClass('hover');
        e.preventDefault();
        e.stopPropagation();
    });
    
$ddzone.bind('drop',
    function(e) {
      
        $ddzone.removeClass('hover');
      
        /*
        * Stop events
        */
        e.preventDefault();
        e.stopPropagation();

        /*
        * HTML5 : get dataTransfer object
        */
        var files = e.originalEvent.dataTransfer.files;

        /*
        * If there is no file, we assume that user dropped
        * something else...a url for example !
        */
        if (files.length === 0) {
            alert("Error : drop a text file");
        }
        else if (files.length > 1) {
            alert("Error : drop only one text file at a time");
        }
        else if (files[0].type.toLowerCase() !== "text/plain") {
            alert("Error : drop a text file");
        }
        /*
        * User dropped a text file
        */
        else {
            
            var f = files[0],
            reader = new FileReader();
            
            /*
             * Update title
             */
            $('#title').html('Result for ' + escape(f.name));
        
            /*
             * Parse and display result
             */
            reader.onloadend = function(e) {
                self.stations = parse(e.target.result);
                display();
            };
            reader.readAsText(f);

        }
    });