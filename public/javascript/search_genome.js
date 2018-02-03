/*
 * This function takes in an array that represents a genome. It also takes in a target dna
 * sequence for which we wish to find the location of in the genome. It will return
 * the index of the location of the target sequence in the main genome
 */

 function findGenome (genome, targetDNA, matchThreshold) {
     var genomeLength = genome.length;
     var startIndex = Math.random() * genomeLength;
     
     var matches = [];
     
     // We iterate over the genome starting at a random position
     for (var i = startIndex; i < genomeLength; i++) {
           
        // We go through and count the number of matches that exist. 
        var numberMatch = 0.0;
        var numberNotMatch = 0.0;
        for (var j = 0; j < targetDNA.length; i++) {
            if ((i + j < genome.length - 1) && genome[i + j].equals(targetDNA[j])) {
                numberMatch++;
            } else {
                numberNotMatch++;
            }
        }
         
         var matchRate = numberMatch / (numberMatch + numberNotMatch);
         
         if (matchRate > matchThreshold) {
             var mutation = new Object();
             mutation.index = i;
             mutation.matchRate = matchRate;
             matches.push(mutation);
         }
     }   
     
     // At this point, we have reached the end of the genome so we go back to the start
     for (var i = 0; i < startIndex; i++) {
             
        // We go through and count the number of matches that exist. 
        var numberMatch = 0.0;
        var numberNotMatch = 0.0;
        for (var j = 0; j < targetDNA.length; i++) {
            if (genome[i + j].equals(targetDNA[j])) {
                numberMatch++;
            } else {
                numberNotMatch++;
            }
        }
         
         var matchRate = numberMatch / (numberMatch + numberNotMatch);
         
         if (matchRate > matchThreshold) {
             var mutation = new Object();
             mutation.index = i;
             mutation.matchRate = matchRate;
             matches.push(mutation);
         }
     }
     
     // If at the end, no match is found, the program votes -1
     return matches;
 }