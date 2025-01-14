(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|85354-9',
                              'http://loinc.org|8310-5']
                      }
                    }
                  });

        var alg = smart.patient.api.fetchAll({
                    type: 'AllergyIntolerance',
                    query: {
                      "clinical-status": "active"
                    }
        })

        $.when(pt, obv, alg).fail(onError);

        $.when(pt, obv, alg).done(function(patient, obv, allergies) {
          var byCodes = smart.byCodes(obv, 'code');

          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family;
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('85354-9'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('85354-9'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var temp = byCodes('8310-5');
          
          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          p.temp = getQuantityValueAndUnit(temp[0]);
          
          var allg = "";

          //build table html 
          for (let i = 0; i < allergies.length; i++) {
            if (typeof allergies[i].code.text !== 'undefined') {
              allg = allg + "<tr>";
              allg = allg + "<td>" + allergies[i].code.text + "</td>";

              // loop through all reactions, and thier severity and and manifestations
              if (typeof allergies[i].reaction !== 'undefined') {
                for (let r = 0; r < allergies[i].reaction.length; r++) {

                  if (typeof allergies[i].reaction[r].severity !== 'undefined') {
                    allg = allg + "<td>Severity: " + allergies[i].reaction[r].severity+"</td>";
                  }

                  allg = allg + "<td>";
                  //loop through manifestations
                  for (let m = 0; m < allergies[i].reaction[r].manifestation.length; m++) {
                    allg = allg + allergies[i].reaction[r].manifestation[m].text + " ";
                  }
                  allg = allg + "</td>";
                }
              }

              allg = allg + "</tr>";
            }
          }
          p.allergies = allg;

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      temp: {value: ''},
      allergies: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#temp').html(p.temp);
    $('#allergies').html(p.allergies);
  };

})(window);
