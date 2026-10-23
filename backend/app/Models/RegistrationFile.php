<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationFile extends Model
{
    protected $table = 'registration_files';

    protected $fillable = [
        'registration_id', 'file_id', 'file_type', 'file_name',
    ];

    protected $casts = [
        'registration_id' => 'integer',
        'file_id'         => 'integer',
    ];

    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registration::class, 'registration_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class, 'file_id');
    }
}
